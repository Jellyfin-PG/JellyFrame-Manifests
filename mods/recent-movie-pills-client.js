(function () {
    'use strict';

    const SELECTOR_SECTION = ".sectionTitleContainer-cards";
    const CSS = `
        .sectionTitleContainer-cards,
        .sectionTitleContainer {
            display: flex !important;
            align-items: center !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            position: relative !important;
            overflow: hidden !important; 
        }

        .sectionTitleContainer-cards > *:not(.genre-pills-clipper),
        .sectionTitleContainer > *:not(.genre-pills-clipper) {
            flex-shrink: 0 !important;
            position: relative !important;
            z-index: 30 !important;
        }

        .sectionTitleContainer-cards .button-flat,
        .sectionTitleContainer .button-flat {
            cursor: pointer !important;
        }

        .sectionTitleTextButton {
            margin-right: 0 !important;
        }

        .genre-pills-clipper {
            flex: 1 1 auto;
            min-width: 0;
            overflow: hidden;
            margin: 0 180px 0 15px; 
            position: relative;
            z-index: 10;
        }

        @media (max-width: 768px) {
            .genre-pills-clipper {
                display: none !important;
            }
        }

        .genre-pills-wrapper {
            display: flex;
            gap: 10px;
            width: 100%;
            overflow-x: auto;
            scrollbar-width: none; 
            -ms-overflow-style: none; 
            padding: 4px 0;
            justify-content: flex-start;
            cursor: grab;
            -webkit-overflow-scrolling: touch;
            
            -webkit-mask-image: linear-gradient(to right, black 65%, transparent 100%);
            mask-image: linear-gradient(to right, black 65%, transparent 100%);
        }

        .genre-pills-wrapper.dragging-active {
            cursor: grabbing;
            user-select: none;
        }

        .genre-pills-wrapper::-webkit-scrollbar {
            display: none; 
        }

        .genre-pill {
            background: rgba(20, 20, 20, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 16px;
            padding: 4px 14px;
            color: #ccc;
            font-size: 0.85rem;
            font-weight: 500;
            font-family: inherit;
            cursor: pointer;
            white-space: nowrap;
            transition: background 0.2s, color 0.2s;
            backdrop-filter: blur(4px);
            user-select: none;
            -webkit-user-drag: none;
        }

        .genre-pill:hover {
            background: rgba(255, 255, 255, 0.15);
            color: #fff;
        }

        .genre-pill.active {
            background: #00a4dc; 
            border-color: #00a4dc;
            color: #fff;
            box-shadow: 0 4px 12px rgba(0, 164, 220, 0.3);
        }
    `;

    if (!document.getElementById('jf-genre-filters-styles')) {
        const style = document.createElement('style');
        style.id = 'jf-genre-filters-styles';
        style.textContent = CSS;
        document.head.appendChild(style);
    }

    async function buildPills(section, itemsContainer, cards) {
        if (!window.ApiClient) return;

        const ids = cards.map(c => c.dataset.id).filter(Boolean);
        if (!ids.length) return;

        let genreMap = {};
        try {
            const userId = window.ApiClient.getCurrentUserId();
            const response = await window.ApiClient.getItems(userId, {
                Ids: ids.join(','),
                Fields: 'Genres'
            });
            response.Items.forEach(item => {
                genreMap[item.Id] = item.Genres || [];
            });
        } catch (err) {
            console.error("Error fetching genres:", err);
            return;
        }

        const allGenres = new Set();
        Object.values(genreMap).forEach(genres => genres.forEach(g => allGenres.add(g)));
        if (allGenres.size === 0) return; 

        const oldClipper = section.querySelector('.genre-pills-clipper');
        if (oldClipper) oldClipper.remove();

        const clipper = document.createElement('div');
        clipper.className = 'genre-pills-clipper';

        const pillsWrapper = document.createElement('div');
        pillsWrapper.className = 'genre-pills-wrapper';
        clipper.appendChild(pillsWrapper);

        let isDown = false;
        let startX;
        let scrollLeft;
        let dragThreshold = 0;

        const startDragging = (e) => {
            isDown = true;
            pillsWrapper.classList.add('dragging-active');
            startX = (e.pageX || e.touches[0].pageX) - pillsWrapper.offsetLeft;
            scrollLeft = pillsWrapper.scrollLeft;
            dragThreshold = 0;
        };

        const stopDragging = () => {
            isDown = false;
            pillsWrapper.classList.remove('dragging-active');
        };

        const moveDragging = (e) => {
            if (!isDown) return;
            const x = (e.pageX || e.touches[0].pageX) - pillsWrapper.offsetLeft;
            const walk = (x - startX); 
            dragThreshold += Math.abs(walk);
            pillsWrapper.scrollLeft = scrollLeft - walk;
        };

        pillsWrapper.addEventListener('mousedown', startDragging);
        pillsWrapper.addEventListener('touchstart', startDragging, { passive: true });
        window.addEventListener('mouseup', stopDragging);
        window.addEventListener('touchend', stopDragging);
        pillsWrapper.addEventListener('mousemove', moveDragging);
        pillsWrapper.addEventListener('touchmove', moveDragging, { passive: true });

        const createPill = (text, genreValue, isActive = false) => {
            const btn = document.createElement('button');
            btn.className = `genre-pill ${isActive ? 'active' : ''}`;
            btn.textContent = text;
            btn.dataset.genre = genreValue;
            return btn;
        };

        pillsWrapper.appendChild(createPill('All', 'All', true));
        Array.from(allGenres).sort().forEach(genre => {
            pillsWrapper.appendChild(createPill(genre, genre));
        });

        const titleLink = section.querySelector('a.sectionTitleTextButton');
        if (titleLink) {
            titleLink.insertAdjacentElement('afterend', clipper);
        }

        pillsWrapper.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (dragThreshold > 10) return;

            const pill = e.target.closest('.genre-pill');
            if (pill) {
                pillsWrapper.querySelectorAll('.genre-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');

                const selectedGenre = pill.dataset.genre;
                cards.forEach(card => {
                    if (selectedGenre === 'All') {
                        card.style.display = '';
                    } else {
                        const cardGenres = genreMap[card.dataset.id] || [];
                        card.style.display = cardGenres.includes(selectedGenre) ? '' : 'none';
                    }
                });
            }
        });
    }

    function initSection(section) {
        const titleLink = section.querySelector('a.sectionTitleTextButton');
        if (!titleLink) return;

        const href = titleLink.getAttribute('href') || '';
        const titleText = titleLink.textContent.toLowerCase();
        
        if (href.includes('collectionType=movies') || titleText.includes('movie')) {
            const parentSection = section.closest('.home-sections, .section, .verticalSection');
            if (!parentSection) return;
            
            const itemsContainer = parentSection.querySelector('.itemsContainer');
            if (!itemsContainer) return;

            const checkCards = async () => {
                const cards = Array.from(itemsContainer.querySelectorAll('.card'));
                if (cards.length > 0) {
                    const currentIds = cards.map(c => c.dataset.id).join(',');
                    if (section.dataset.renderedIds === currentIds) return;
                    section.dataset.renderedIds = currentIds;
                    await buildPills(section, itemsContainer, cards);
                }
            };

            const observer = new MutationObserver(checkCards);
            observer.observe(itemsContainer, { childList: true, subtree: true });
            checkCards();
        }
    }

    const findAndInject = () => {
        const sections = document.querySelectorAll(`${SELECTOR_SECTION}:not(.has-genre-filters)`);
        sections.forEach(section => {
            section.classList.add('has-genre-filters');
            initSection(section);
        });
    };

    new MutationObserver(findAndInject).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('viewshow', findAndInject);
    findAndInject();
})();
