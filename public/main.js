$(function() {
	var button = $('#submitButton'),
		textInput = $('#textInput'),
		results = $('.results'),
		characters = $('.characters'),
		message = $('.message'),
		selectedAccountType = 2,
		errUnableToConnectToBungie = {text:'unable to connect to Bungie'},
		errNoResponseFromBungie = {text:'no response from Bungie'},
		errNoMatchesFound = {text:'no matches found'},
		errNoCharactersFound = {text:'no characters found'},
		errUnableToConnect = {text: 'unable to connect'},
		hashes = {
			3159615086: 'glimmer',
			1415355184: 'crucible marks',
			1415355173: 'vanguard marks',
			898834093: 'exo',
			3887404748: 'human',
			2803282938: 'awoken',
			3111576190: 'male',
			2204441813: 'female',
			671679327: 'hunter',
			3655393761: 'titan',
			2271682572: 'warlock',
			3871980777: 'New Monarchy',
			529303302: 'Cryptarch',
			2161005788: 'Iron Banner',
			452808717: 'Queen',
			3233510749: 'Vanguard',
			1357277120: 'Crucible',
			2778795080: 'Dead Orbit',
			1424722124: 'Future War Cult',
			weeklyMarks: {
				2033897742: 'Weekly Vanguard Marks',
				2033897755: 'Weekly Crucible Marks'
			}
		},
		mostRecentCharacterDate = null;

	function getUrlVars()
	{
	    var vars = [], hash;
	    var hashes = window.location.href.slice(window.location.href.indexOf('#') + 1).split('&');
	    for(var i = 0; i < hashes.length; i++)
	    {
	        hash = hashes[i].split('=');
	        vars.push(hash[0]);
	        vars[hash[0]] = hash[1];
	    }
	    return vars;
	}

	function jsonp(url, success, failure) {
		$.ajax({
			type: 'POST',
			url: '/proxyJSON',
			data: JSON.stringify({targetUrl: url}),
			contentType:'application/json; charset=utf-8',
			dataType: 'json'
		}).done(function(data) {
			if(data.Response) {
				success(data);
			} else {
				failure(errNoResponseFromBungie);
			}
		}).fail(function () {
			failure(errUnableToConnect);
		});
	}

	function searchForMembership(username) {
		var dfd = new $.Deferred();
		jsonp('http://www.bungie.net/Platform/Destiny/SearchDestinyPlayer/' + selectedAccountType + '/' + username + '/',
			function(data) {
				if(data && data.Response) {
					return handleSearchResponse(data.Response, dfd);
				} else {
					dfd.reject(errNoResponseFromBungie);
				}
			},
			function(error) {
				dfd.reject(error);
			}
		);
		return dfd;
	}

	function handleSearchResponse(res, dfd) {
		if(!res) {
			dfd.reject(errNoResponseFromBungie);
			return dfd;
		}
		if(res.length < 1) {
			dfd.reject(errNoMatchesFound);
		} else {
			dfd.resolve(res);
		}
		return dfd;
	}

	function showMessage(msg) {
		if(!msg) {
			return;
		}
		if(typeof msg === 'string') {
			msg = {text:msg};
		}
		if(msg.level === 'info') {
			message.css('color','');
		} else {
			message.css('color','#a94442');
		}
		if(msg.text) {
			message.text(msg.text);
		} else {
			message.text('unknown error');
		}
	}

	function showError(err) {
		if(typeof err === 'string') {
			err = {text:err};
		}
		err.level = 'error';
		showMessage(err);
	}

	function getCharacterIds(member) {
		var dfd = new $.Deferred(),
			accountType = 'TigerPSN';

		if(member.membershipType === 1) {
			accountType = 'TigerXbox';
		}

		jsonp('http://www.bungie.net/Platform/Destiny/' + accountType + '/Account/' + member.membershipId + '/',
			function(data) {
				if(data && data.Response) {
					return handleCharacterIdsResponse(data.Response, dfd);
				} else {
					dfd.reject(errNoResponseFromBungie);
				}
			},
			function(err) {
				dfd.reject(err);
			}
		);
		return dfd;
	}

	function handleCharacterIdsResponse(res, dfd) {
		if(!res) {
			dfd.reject(errNoResponseFromBungie);
			return dfd;
		}
		if(!res.data || !res.data.characters || res.data.characters.length < 1) {
			dfd.reject(errNoCharactersFound);
		} else {
			dfd.resolve(res);
		}
		return dfd;
	}

	function loadCharacterInfo(character, isLastCharacter) {
		var profileHref = 'http://www.bungie.net/en/Legend/' + character.characterBase.membershipType + '/' + character.characterBase.membershipId + '/' + character.characterBase.characterId;
		getCurrency(character.characterBase)
		.done(function (res) {
			var d = $('<div class="character-container"/>').html('<a class="character-link" href="' + profileHref + '">' + character.characterLevel + ' ' + hashes[character.characterBase.genderHash] + ' ' + hashes[character.characterBase.raceHash] + ' ' + hashes[character.characterBase.classHash] + '</a>');
			for(var i=0;i<res.length;i++) {
				d.append(' ' + res[i].value + ' ' + hashes[res[i].itemHash]);
				if(i<res.length-1) {
					d.append(',');
				}
			}
			var w = $('<div/>')
				.addClass('character-weekly-marks')
				.appendTo(d);
			getProgress(character.characterBase)
			.done(function (res) {
				for(var i=0;i<res.length;i++) {
					if(hashes[res[i].progressionHash]) {
						d.append(buildProgressBar(res[i]));
					} else if(hashes.weeklyMarks[res[i].progressionHash]) {
						w.append(buildMarksBar(res[i]));
					}
				}
				var characterDate = new Date(character.characterBase.dateLastPlayed);
				if(!mostRecentCharacterDate || characterDate - mostRecentCharacterDate > 0) {
					d.prependTo(characters);
					mostRecentCharacterDate = characterDate;
				} else {
					d.appendTo(characters);
				}
			})
			.always(function () {
				if(isLastCharacter) {
					results.show();
					message.empty();
					button.attr('disabled',false);
				}
			});
		});
	}

	function getCurrency(characterBase) {
		var dfd = new $.Deferred(),
			accountType = 'TigerPSN';

		if(characterBase.membershipType === 1) {
			accountType = 'TigerXbox';
		}

		jsonp('http://www.bungie.net/Platform/Destiny/' + accountType + '/Account/' + characterBase.membershipId + '/Character/' + characterBase.characterId + '/Inventory/',
			function(data) {
				if(data && data.Response && data.Response.data && data.Response.data.currencies && data.Response.data.currencies.length) {
					return dfd.resolve(data.Response.data.currencies);
				} else {
					dfd.reject(errNoResponseFromBungie);
				}
			},
			function(err) {
				dfd.reject(err);
			}
		);
		return dfd;
	}

	button.on('click', function() {
		var username = textInput.val().replace(/\s/g, '');
		textInput.val(username);
		if(!username) {
			return;
		}
		updateHash();
	});

	function performSearch() {
		showMessage({text:'loading...',level:'info'});
		button.attr('disabled',true);
		characters.empty();
		searchForMembership(textInput.val())
		.done(function(res){
			if(!res || res.length < 1) {
				showError();
				return;
			}
			var member = {};
			for(var i=0;i<res.length;i++) {
				if(res[i].membershipType === selectedAccountType) {
					member = res[i];
					break;
				}
			}
			getCharacterIds(member)
			.done(function(res) {
				for(var i=0;i<res.data.characters.length;i++) {
					loadCharacterInfo(res.data.characters[i], i===res.data.characters.length-1);
				}
			})
			.fail(function(res) {
				showError(res);
				button.attr('disabled',false);
			});
		})
		.fail(function(res){
			showError(res);
			button.attr('disabled',false);
		});
	}

	function updateHash() {
		window.location.hash = 'un=' + textInput.val() + '&t=' + selectedAccountType;
	}

	function getProgress(characterBase) {
		var dfd = new $.Deferred(),
			accountType = 'TigerPSN';

		if(characterBase.membershipType === 1) {
			accountType = 'TigerXbox';
		}

		jsonp('http://www.bungie.net/Platform/Destiny/' + accountType + '/Account/' + characterBase.membershipId + '/Character/' + characterBase.characterId + '/Progression/',
			function(data) {
				if(data && data.Response && data.Response.data && data.Response.data.progressions && data.Response.data.progressions.length) {
					return dfd.resolve(data.Response.data.progressions);
				} else {
					dfd.reject(errNoResponseFromBungie);
				}
			},
			function(err) {
				dfd.reject(err);
			}
		);
		return dfd;
	}

	function buildProgressBar(progressionData) {
		var container = $('<div/>')
				.addClass('progress-container'),
			description = $('<div/>')
				.addClass('progress-description container clearfix'),
			faction = $('<div/>')
				.addClass('pull-left')
				.text(hashes[progressionData.progressionHash]),
			rank = $('<div/>')
				.addClass('pull-right')
				 .text('Rank ' + progressionData.level),
			progress = $('<div/>')
				.addClass('progress'),
			progressbar = $('<div/>')
				.addClass('progress-bar')
				.attr('role','progressbar')
				.attr('aria-valuenow',progressionData.progressToNextLevel)
				.attr('aria-valuemax',progressionData.nextLevelAt)
				.attr('aria-valuemin','0')
				.width(progressionData.progressToNextLevel/progressionData.nextLevelAt*100 + '%')
				.text(progressionData.progressToNextLevel + '/' + progressionData.nextLevelAt)
				.css('padding-left','3px');
		progress.append(progressbar);
		description.append(faction, rank);
		return container.append(description, progress);
	}

	function buildMarksBar(progressionData) {
		var container = $('<div/>')
				.addClass('progress-container'),
			description = $('<div/>')
				.addClass('progress-description container clearfix'),
			title = $('<div/>')
				.addClass('pull-left')
				.text(hashes.weeklyMarks[progressionData.progressionHash]),
			progress = $('<div/>')
				.addClass('progress'),
			progressbar = $('<div/>')
				.addClass('progress-bar')
				.attr('role','progressbar')
				.attr('aria-valuenow',progressionData.level)
				.attr('aria-valuemax',100)
				.attr('aria-valuemin','0')
				.width(progressionData.level + '%')
				.text(progressionData.level + '/100')
				.css('padding-left','3px');
		progress.append(progressbar);
		description.append(title);
		return container.append(description, progress);
	}

	function updateFormFromHash() {
		var urlVars = getUrlVars();
		textInput.val(urlVars.un);
		if(urlVars.t) {
			selectedAccountType = parseInt(urlVars.t);
			$('input:radio[name=accountType][value=' + urlVars.t + ']').click();
		}
		if(urlVars.un && urlVars.t) {
			performSearch();
		} else {
			characters.empty();
		}
	}

	$(window).on('hashchange', function() {
		updateFormFromHash();
	});

	$("input:radio[name=accountType]").click(function() {
    	selectedAccountType = parseInt($(this).val());
	});

	textInput.on('keypress', function(e) {
		if(e.keyCode === 13) {
			button.click();
		}
	});

	textInput.focus();

	updateFormFromHash();

	var headerHeight = parseInt($('.header').css('height')),
		coolStuffDiv = $('.cool-stuff'),
		aboutDiv = $('.about'),
		contactDiv = $('.contact');

	function scrollToDiv(div) {
		var pos = div.offset();
		pos.top -= headerHeight;
		scrollTo(pos.left, pos.top);
	}

	$('.search-link').on('click', function() {
		scrollTo(0);
	});

	$('.cool-stuff-link').on('click', function() {
		scrollToDiv(coolStuffDiv);
	});

	$('.about-link').on('click', function() {
		scrollToDiv(aboutDiv);
	});

	$('.contact-link').on('click', function() {
		scrollToDiv(contactDiv);
	});

});
