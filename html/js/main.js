$(document).ready(function () {
	var init = function() {
		var currentStatus = null;
		var currentQueue = [];

		var getStatus = function (callback) {
			$.ajax({
				url: "/status",
				method: "GET",
				success: function (data) {
					if (currentStatus != null) {
						var currentTrack = currentStatus.track.track_resource.uri.replace("spotify:album:", "");
						var newTrack = data.track.track_resource.uri.replace("spotify:album:", "");

						currentStatus = data;

						if (currentTrack !== newTrack) {
							trackChanged();
						}
					} else {
						currentStatus = data;
						trackChanged();
					}

					if (typeof callback === "function") callback();
				}
			});
		};

		var delay = (function(){
			var timer = 0;

			return function(callback, ms){
				clearTimeout (timer);
				timer = setTimeout(callback, ms);
			};
		})();

		var getAlbumArt = function (id, callback) {
			$.ajax({
				url: "https://api.spotify.com/v1/albums/" + id,
				success: function (response) {
					var imageUri = response.images[0].url;

					callback(imageUri);
				}
			})
		};

		var onQueueChange = function (newQueue) {
			currentQueue = newQueue;
			$(".queue-list").empty();

			for (var i = 0; i < currentQueue.length; i++)
				(function (index) {
					var element = currentQueue[index];
					var dom = $("<li></li>", {
						"data-track-id": element,
						class: "queue-item",
						html: [

						]
					});

					$(".queue-list").append(dom);

					getTrackInfo(element, function (track) {
						var dom = $("<div></div>", {
							class: "queue-container",
							html: [
								$("<div></div>", {
									class: "queue-album-art",
									html: [
										$("<img/>", {
											src: track.albumImage,
											alt: track.albumName
										})
									]
								}),
								$("<div></div>", {
									class: "queue-track-info",
									html: [
										$("<span></span>", {
											class: "queue-track-name",
											text: track.trackName
										}),
										$("<span></span>", {
											class: "queue-track-artist",
											text: track.artistName
										}),
										$("<span></span>", {
											class: "queue-track-album",
											text: track.albumName
										}),
									]
								})
							]
						});

						$("li[data-track-id=" + element + "]").append(dom);
					});
				})(i);
		};

		var hasQueueChanged = function (newQueue) {
			if (!newQueue) {
				return false;
			}

			if (newQueue.length != currentQueue.length) {
				return true;
			}

			for (var i = 0; i < newQueue.length; i++) {
				if (newQueue[i] !== currentQueue[i]) {
					return true;
				}
			}

			return false;
		};

		var refreshQueue = function () {
			$.ajax({
				url: '/queue',
				method: 'GET',
				success: function (response) {
					if (hasQueueChanged(response)) {
						onQueueChange(response);
					}
				}
			})
		};

		var searchSpotify = function (text) {
			if (text.length == 0) {
				$(".search-results").empty();
				return;
			}

			$.ajax({
				url: "https://api.spotify.com/v1/search?type=track&q=" + text,
				error: function () {
					$(".search-results").empty();
				},
				success: function (data) {
					var tracks = data.tracks.items;
					var results = [];
					$(".search-results").empty();

					tracks.sort(function (a, b) {
						if (a.popularity < b.popularity) {
							return 1;
						}

						if (a.popularity > b.popularity) {
							return -1;
						}

						return 0;
					});

					for (var i = 0; i < tracks.length; i++) {
						(function (index) {
							var el = tracks[index];
							var trackId = el.id;
							var albumArtSmall = el.album.images[2].url;
							var trackName = el.name;
							var trackArtist = el.artists[0].name;
							var queueUrl = "/queue?trackId=" + trackId;

							currentQueue.push(trackId);
							onQueueChange(currentQueue);

							var el = $("<li></li>", {
								class: "search-results-item",
								html: [
									$("<div></div>", {
										class: "results-item-image-container",
										html: [
											$("<img/>", {
												src: albumArtSmall
											})
										]
									}),
									$("<div></div>", {
										class: "results-item-info",
										html: [
											$("<div></div>", {
												class: "item-info-title",
												text: trackName
											}),
											$("<div></div>", {
												class: "item-info-artist",
												text: trackArtist
											})
										]
									}),
									$("<div></div>", {
										class: "results-item-queue",
										html: [
											$("<button></button>", {
												class: "queue-button",
												html: [
													$("<img/>", {
														src: "./images/add.svg"
													})
												],
												on: {
													click: function () {
														$.ajax({
															url: queueUrl,
															success: function (data) {
																var el = $("<div></div>", {
																	class: "queue-added-flyout",
																	style: "opacity: 0",
																	html: [
																		$("<div></div>", {
																			class: "flyout-inner",
																			html: [
																				$("<img/>", {
																					class: "flyout-image",
																					src: "./images/queued.svg"
																				}),
																				$("<span></span>", {
																					class: "flyout-text",
																					text: "Added"
																				})
																			]
																		})
																	]
																});

																$("body").append(el);

																$(el).animate({
																	opacity: 1
																}, 500, function () {
																	setTimeout(function () {
																		$(el).fadeOut(200);
																	}, 1000);
																})
															}
														});

														$(".spotify-search input").val("");
														$(".search-results").empty("");
													}
												}
											})
										]
									})
								]
							});

							results.push(el);
						})(i);
					}

					$(".search-results").append(results);
				}
			});
		};

		var updatePlayingUi = function () {
			var playing = currentStatus.playing;
			var currentPlayPosition = (currentStatus.playing_position / currentStatus.track.length) * 100;

			$(".track-duration-track").css("width", currentPlayPosition + "%");

			$(".upvote-count").text(currentStatus.currentUpvotes);
			$(".downvote-count").text(currentStatus.currentDownvotes);

			if (playing) {
				$(".spotify-button.playpause img").attr("src", "./images/pause.svg");
			} else {
				$(".spotify-button.playpause img").attr("src", "./images/play.svg");
			}
		};

		var updateTrackUi = function () {
			var albumId = currentStatus.track.album_resource.uri.replace("spotify:album:", "");
			var currentTrackTitle = currentStatus.track.track_resource.name;
			var currentArtistTitle = currentStatus.track.artist_resource.name;
			var currentAlbumTitle = currentStatus.track.album_resource.name;
			var nowPlayingAreaHeight = $(".playing-panel-inner").height() - 20;

			getAlbumArt(albumId, function (imageUri) {
				$(".album-artwork").attr("src", imageUri);
			});

			$(".now-playing-container").height(nowPlayingAreaHeight);
			$(".now-playing-container").width(nowPlayingAreaHeight);

			$(".song-title").text(currentTrackTitle);
			$(".artist-title").text(currentArtistTitle);
			$(".album-title").text(currentAlbumTitle);
		};

		var getTrackInfo = function (trackId, callback) {
			$.ajax({
				url: 'https://api.spotify.com/v1/tracks/' + trackId,
				method: "GET",
				success: function (response) {
					var track = {
						albumName: response.album.name,
						albumImage: response.album.images[1].url,
						artistName: response.artists[0].name,
						trackName: response.name
					};

					callback(track);
				}
			})
		};

		var trackChanged = function () {
			window.localStorage.setItem("hasVoted", false);

			currentQueue.shift();
			onQueueChange(currentQueue);
			updateTrackUi();
		};

		$(".playpause").on('click', function () {
			var endpoint = currentStatus != null
				? currentStatus.playing
					? "/pause"
					: "/unpause"
				: "/unpause";
			$.ajax({
				url: endpoint
			});
		});

		$(".queue-button").on('click', function () {
			$(".queue-panel").toggleClass("shown");
		});

		$(".downvote").on("click", function () {
			if (window.localStorage.getItem("hasVoted") == "true") return;

			var count = Number($(".downvote-count").text());

			count++;

			window.localStorage.setItem("hasVoted", true);

			$(".downvote-count").text(count);

			$.ajax({
				url: "/downvote"
			});
		});

		$(".upvote").on("click", function () {
			if (window.localStorage.getItem("hasVoted") == "true") return;

			var count = Number($(".upvote-count").text());

			count++;

			$(".upvote-count").text(count);

			window.localStorage.setItem("hasVoted", true);

			$.ajax({
				url: "/upvote"
			});
		});


		var searchInput = $(".spotify-search input");
		var searchImg = $(".spotify-search img");

		searchInput.on("keyup", function () {
			var text = $(this).val()
			delay(function () {
				searchSpotify(text);
			}, 500);
		});

		searchInput.on("focus", function () {
			searchInput.css({'opacity': 1});
			searchImg.css({'opacity': 0});
		});

		searchInput.on("blur", function () {
			searchInput.css({'opacity': 0});
			searchImg.css({'opacity': 1});
		});

		getStatus(updatePlayingUi);

		setInterval(function () {
			getStatus(updatePlayingUi);
		}, 1000);

		refreshQueue();

		setInterval(refreshQueue, 2000);
	};

	var loginPage = function () {
		return $("<div></div>", {
			class: "login-page",
			html: [
				$("<div></div>", {
					class: "login-page-inner",
					html: [
						$("<div></div>", {
							class: "login-form-container",
							html: [
								$("<form></form>", {
									class: "login-form",
									html: [
										$("<input/>", {
											name: "uid",
											type: "password",
											placeholder: "Unique ID"
										}),
										$("<button></button>", {
											class: "login-button",
											text: "Login",
											type: "button",
											on: {
												click: function () {
													$.ajax({
														url: "/auth",
														data: {
															authId: $("input[name=uid]").val()
														},
														success: function () {
															$(".login-page").remove();
															init();
														},
														error: function () {
															$(".error").text("Invalid UID");
														}
													})
												}
											}
										}),
										$("<span></span>", {
											class: "error"
										})
									]
								})
							]
						})
					]
				})
			]
		})
	};

	$.ajax({
		url: "/auth",
		method: "GET",
		success: function (response, textStatus) {
			if (!response.auth) {
				$("body").append(loginPage());
			} else {
				init();
			}
		}
	});
});
