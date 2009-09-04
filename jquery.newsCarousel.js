/*
 *	news story carousel type thing
 *	Will depsnd on a fixed sized container at the moment
 */

(function($){
	var	empty = function(){},
		default_options = {
			// setup
			startIndex: 0,
			debug: false,
			autoplay: true,
			transition: "fade", // "fade" or "slide"
			queue: false, // should we queue up clicks while the transition happens? // TODO not yet implemented
			transitionDuration: 300, // transition time
			displayDuration: 5000, // time to display an item before changing
			displayNum: 1, // TODO how many to display at once - NOT YET IMPLEMENTED - affects prev / next and change
		
			// controls
			prev: false, // pass in a jQuery object eg. $("#prev")
			next: false, // jquery object eg. $("#next")
			navButtons: false, // $(".navButtons") - automatically assigns the first, second third slide etc to the first, second third button in the jQuery object
			toggle: false, // alternates play / pause
			play: false,
			pause: false,
		
			// events
			onPlay: empty,
			onPause: empty,
			onChange: empty, // to, from
			onTransitionStart: empty,
			onTransitionEnd: empty
		},
		debug = empty,
		mod = function(n, base){
			var rslt = n % base;
			if(rslt < 0){
				return rslt + base;
			}
			return rslt;
		};
	
	$.fn.extend({
		newsCarousel: function(options){
			options = $.extend(default_options, options);
			
			if("function" === typeof(options.debug)){
				debug = options.debug;
			} else if(options.debug){
				debug = "undefined" === typeof(console) ? function(){alert(Array.slice(arguments).join(", "));} : console.log;
			}
			
			// can only be applied to one element at a time to keep the closure clear - so no this.each
			var el = this[0];
			if(!(el)){
				// Spectrum is red
				debug("no tag provided (selector didn't return any elements)");
				return false;
			} else if(("UL" === el.tagName || "OL" === el.tagName)){
				// Spectrum is green

				// set up everything
				el = $(el).css({
					height: $(el).height(),
					width: $(el).width(),
					overflow: "hidden",
					position: ("static" === $(el).css("position")) ? "relative" : $(el).css("position")
				});
				
				var	items = false,
					current = options.startIndex,
					runningFx = false,
					playing = options.autostart,
					timer = false,
					itemWidth = false,
					itemHeight = false,
					itemPosition = false;
				
				function setupItems(){
					items = el.children();
					if(!items.length){
						debug("No child li elements found");
					}
					
					// set some values by reading from a visible one
					var visible = items.filter(":visible");
					if(0 === visible.length){
						// we'll need to make one visible to read its dims
						items[options.startIndex].show();
						itemWidth = items.eq(options.startIndex).width();
						itemHeight = items.eq(options.startIndex).height();
						itemPosition = items.eq(options.startIndex).position();
					} else{
						itemWidth = visible.eq(0).width();
						itemPosition = visible.eq(0).position();
						itemHeight = visible.eq(0).height();
					}
					if(0 === $(el).height()){
						$(el).height(itemHeight);
					}
					
					items.each(function(i, item){
						// finds visible one and read its width (we'll assume they're the same!)
						item = $(item);
						// set up items depending on our transition mode (sadly, they're totally different)
						if("fade" === options.transition){
							// set their position to absolute, width to the width and offsets to the offests
							item.css({
								position: "absolute",
								top: itemPosition.top,
								left: itemPosition.left,
								width: itemWidth,
								"z-index": 50,
								opacity: (i === options.startIndex) ? 1 : 0,
								display: "block"
							});
						} else if("slide" === options.transition){
							// put them out of sight inside the ul - we'll position them on the fly
							item.css({
								position: "absolute",
								top: itemPosition.top,
								left: (i === options.startIndex) ? itemPosition.left : (-itemWidth - 1000),
								width: itemWidth,
								"z-index": 50,
								display: "block"
							});
						} else{
							// shouldn't get here
							debug("Invalid transition method defined in the options - expecting 'fade' or 'slide'");
							return false;
						}
					});	
					return true;
				}
				
				// does the 'fade' change
				var change_fade = function(i, quick){
					// crossfade the old and new or just hide one and show the other
					options.onChange(i, current);
					if(quick){
						// hide and show
						items.eq(current).hide();
						items.eq(i).show();
					} else{
						// put them on top of each other and crossfade (fade out top one?)
						runningFx = true;
						options.onTransitionStart();
						items.eq(current).stop(true, true).animate({opacity: 0}, {
							easing: "linear",
							duration: options.transitionDuration
						});
						items.eq(i).stop(true, true).css({
							"z=index": 51
						}).animate({opacity: 1}, {
							easing: "linear",
							duration: options.transitionDuration,
							complete: function(){
								items.eq(i).css("z=index", 50);
								runningFx = false;
								options.onTransitionEnd();
							}
						});
					}
					return true;
				};
				// does the 'slide' change
				var change_slide = function(i, quick){
					// slide the position, or move it immediately
					options.onChange(i, current);
					if(quick){
						items.eq(current).css("left", (-itemWidth - 1000));
						items.eq(current).css("left", itemPosition.left);
					} else{
						// put them side by side and move
						runningFx = true;
						options.onTransitionStart();
						items.eq(i).stop(true, true).css({
							left: ((i < current) ? -itemWidth : itemWidth)
						}).animate({left: 0}, {
							duration: options.transitionDuration,
							complete: function(){
								runningFx = false;
								options.onTransitionEnd();
							}
						});
						items.eq(current).stop(true, true).animate({left: ((i < current) ? itemWidth : -itemWidth)}, {
							duration: options.transitionDuration,
							complete: function(){
								$(this).css("left", (-itemWidth - 1000));
							}
						});
					}
					return true;
				};

				// private function actually changes the visible item
				var change = function(i, quick){
					var restart = playing;
					controls.pause();
					// three cases - quick, fade and slide
					if(current === i){
						if(restart){
							controls.play();
						}
						return true;
					}
					
					if("fade" === options.transition){
						change_fade(i, quick);
					} else if("slide" === options.transition){
						change_slide(i, quick);
					} else{
						// transition mode is checked on init, so we can't get here
						debug("unreachable code block executed! [change transition exception]");
						return false;
					}
					current = i;
					if(restart){
						controls.play();
					}
				};

				// public controls methods
				var controls = {
					// starts playing
					// optional argument defines where to start playing from
					play: function(i) {
						if("undefined" !== typeof(i)){
							change(i, true);
						}
						timer = setTimeout(function(){
							change(mod(current + 1, items.length));
						}, options.displayDuration);
						playing = true;
						options.onPlay();
					},
					// pauses (stops) autoplaying
					pause: function() {
						clearTimeout(timer);
						playing = false;
						options.onPause();
					},
					// toggles play / pause state
					toggle: function() {
						if(playing){
							controls.pause();
						} else{
							controls.play();
						}
					},
					// goes to the passed item
					// optional quick arg skips the transition
					jump_to: function(i, quick) {
						change(i, quick);
					},
					// goes to the next item (wraps back to the begining if we're at the last)
					// optional quick arg skips the transition
					next: function(quick) {
						change(mod(current + 1, items.length), quick);
					},
					// goes to the previous item (wraps back to the end if we're at the first item)
					// optional quick arg skips the transition
					prev: function(quick) {
						change(mod(current - 1, items.length), quick);
					}
				};
				
				// add controls from options and assign events automatically
				$.each(["toggle", "prev", "next", "controls", "play", "pause"], function(i, control){
					if(options[control]){
						if(options[control].length){
							options[control].click(function(e){
								e.preventDefault();
								controls[control]();
								this.blur();
							});
						}
					}
				});
				
				// add navigation buttons from option and assign events automatically
				if(options.navButtons.length){
					options.navButtons.each(function(i, button){
						$(button).click(function(e){
							e.preventDefault();
							controls.jump_to(mod(i, items.length));
							this.blur();
						});
					});
				}
				
				// begin
				if(setupItems()){
					if(options.autoplay){
						controls.play();
					}
					// return handles for the plugin
					return {
						play: controls.play,
						pause: controls.pause,
						jump_to: controls.jump_to,
						next: controls.next,
						prev: controls.prev,
						toggle: controls.toggle
					};
				} else{
					debug("Couldn't setup items");
					return false;
				}
			} else{
				// invalid tag type - only lists supprted for now
				debug("invalid tag type - expecting 'ul' or 'ol'");
				return false;
			}
		}
	});
	
})(jQuery);