(function () {
    'use strict';

    if (window.__jfCustomBgsLoaded) return;
    window.__jfCustomBgsLoaded = true;

    var css = "";
    var mappings = {};

    function addRule(title, url, className) {
        if (!url || url.indexOf('{{') === 0) return;

        css += "." + className + " .cardImageContainer { background-image: url('" + url + "') !important; background-size: cover !important; background-position: center !important; opacity: 1 !important; }\n";
        
        css += "." + className + " .blurhash-canvas { display: none !important; }\n";
        css += "." + className + " .cardImageIcon { display: none !important; }\n";
        css += "." + className + " .cardPadder { background-color: transparent !important; }\n";
        
        mappings[title.toLowerCase().trim()] = className;
    }

    addRule("movies", "{{BG_MOVIES}}", "jf-bg-movies");
    addRule("shows", "{{BG_SHOWS}}", "jf-bg-shows");
    addRule("tv shows", "{{BG_SHOWS}}", "jf-bg-shows-alt");
    addRule("music", "{{BG_MUSIC}}", "jf-bg-music");
    addRule("books", "{{BG_BOOKS}}", "jf-bg-books");
    addRule("comics", "{{BG_COMICS}}", "jf-bg-comics");
    addRule("live tv", "{{BG_LIVETV}}", "jf-bg-livetv");

    var customStr = "{{BG_CUSTOM}}";
    if (customStr && customStr.indexOf('{{') !== 0) {
        var pairs = customStr.split('|');
        for (var i = 0; i < pairs.length; i++) {
            var kv = pairs[i].split('=');
            if (kv.length >= 2) {
                var t = kv[0];
                var u = kv.slice(1).join('='); 
                addRule(t, u, "jf-bg-custom-" + i);
            }
        }
    }

    if (css === "") return; 

    var style = document.createElement('style');
    style.id = 'jf-custom-bg-styles';
    style.textContent = css;
    document.head.appendChild(style);

    function processCards() {
        var cards = document.querySelectorAll('.card[data-type="CollectionFolder"], .card[data-type="UserView"]');
        
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            if (card.dataset.bgProcessed) continue;

            var titleEl = card.querySelector('.cardTextActionButton');
            if (titleEl) {
                var title = (titleEl.getAttribute('title') || titleEl.innerText || '').toLowerCase().trim();
                var className = mappings[title];
                
                if (className) {
                    card.classList.add(className);
                    
                    var imgCont = card.querySelector('.cardImageContainer');
                    if (imgCont) {
                        imgCont.classList.remove('lazy-hidden');
                        imgCont.classList.add('lazy-image-fadein-fast');
                    }
                }
            }
            card.dataset.bgProcessed = "true";
        }
    }

    var observer = new MutationObserver(processCards);
    observer.observe(document.body, { childList: true, subtree: true });
    
    document.addEventListener('viewshow', processCards);
    processCards();

})();
