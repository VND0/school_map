const AppState = {
    isPanning: false,
    isZooming: false,
    currentTransform: { x: 0, y: 0, scale: 1 },
    startPoint: { x: 0, y: 0 },
    lastX: 0,
    lastY: 0,

    init() {
        this.isPanning = false;
        this.isZooming = false;
        this.currentTransform = { x: 0, y: 0, scale: 1 };
        this.startPoint = { x: 0, y: 0 };
        this.lastX = 0;
        this.lastY = 0;
    }
};

const DOMElements = {
    card: null,
    slider: null,
    schoolMap: null,
    floorButtons: [],
    searchInput: null,
    zoomInBtn: null,
    zoomOutBtn: null,
    closeCardBtn: null,
    mapContainer: null,

    init() {
        this.card = document.querySelector(".card");
        this.slider = document.querySelector(".slider");
        this.schoolMap = document.getElementById("school-map");
        this.floorButtons = document.querySelectorAll('.floor-buttons input');
        this.searchInput = document.getElementById('searchInput');
        this.zoomInBtn = document.getElementById('zoom-in');
        this.zoomOutBtn = document.getElementById('zoom-out');
        this.closeCardBtn = document.getElementById('close-card');
        this.mapContainer = document.querySelector('.map-container');
    }
};

class SliderOfCard {
    constructor() {
        this.startY = 0;
        this.currentY = 0;
        this.dragging = false;

        this.startDrag = this.startDrag.bind(this);
        this.onDrag = this.onDrag.bind(this);
        this.endDrag = this.endDrag.bind(this);

        DOMElements.slider.addEventListener('pointerdown', this.startDrag);
    }

    startDrag(e) {
        this.dragging = true;
        this.startY = e.clientY;

        DOMElements.card.style.transition = 'none';

        DOMElements.slider.setPointerCapture(e.pointerId);

        DOMElements.slider.addEventListener('pointermove', this.onDrag);
        DOMElements.slider.addEventListener('pointerup', this.endDrag);
        DOMElements.slider.addEventListener('pointercancel', this.endDrag);
    }

    onDrag(e) {
        if (!this.dragging) return;

        this.currentY = e.clientY - this.startY;

        if (this.currentY > 0) {
            DOMElements.card.style.transform = `translateY(${this.currentY}px)`;
        }
    }

    endDrag(e) {
        this.dragging = false;

        DOMElements.card.style.transition = 'transform 0.3s ease';

        if (this.currentY > 200) {
            DOMElements.card.style.transform = 'translateY(100vh)';
            setTimeout(() => {
                DOMElements.card.style.display = 'none';
            }, 300);
        } else {
            DOMElements.card.style.transform = 'translateY(0)';
        }

        this.currentY = 0;

        DOMElements.slider.removeEventListener('pointermove', this.onDrag);
        DOMElements.slider.removeEventListener('pointerup', this.endDrag);
        DOMElements.slider.removeEventListener('pointercancel', this.endDrag);
    }
}

class Card {
    constructor() {
        this.title = DOMElements.card.querySelector("h2");
        this.image = DOMElements.card.querySelector("img");
        this.description = DOMElements.card.querySelector(".description");
    }

    remove() {
        DOMElements.card.style.transform = 'translateY(100vh)';
        DOMElements.card.style.display = "none";
    }

    reveal() {
        DOMElements.card.style.removeProperty("display");
        DOMElements.card.style.transform = "translateY(100vh)";
        DOMElements.card.style.transition = "transform 0.3s ease";
        DOMElements.card.getBoundingClientRect();
        DOMElements.card.style.transform = "translateY(0)";
        setTimeout(() => {
            DOMElements.card.style.removeProperty("transition");
        }, 300);
    }

    fillObjectData(objectData) {
        this.title.textContent = objectData.title;
        this.description.innerHTML = objectData.description;

        if(objectData.image && objectData.image.byteLength > 0) {
            const blob = new Blob([objectData.image], {type: 'application/octet-stream'});
            this.image.src = URL.createObjectURL(blob);
        } else {
            this.image.src = 'static/img/search-icon.svg';
        }
    }

    clearCard() {
        this.title.textContent = "";
        this.description.textContent = "";
        this.image.src = "";
    }
}

const MapManager = {
    // Получение координат события
    getEventPoint(evt) {
        const CTM = DOMElements.schoolMap.getScreenCTM();
        if (evt.touches) { evt = evt.touches[0]; }
        return {
            x: (evt.clientX - CTM.e) / CTM.a,
            y: (evt.clientY - CTM.f) / CTM.d
        };
    },

    // Начало панорамирования
    startPan(evt) {
        if (evt.button !== 0) return;

        AppState.isPanning = true;
        const point = this.getEventPoint(evt);
        AppState.startPoint = {
            x: point.x - AppState.currentTransform.x,
            y: point.y - AppState.currentTransform.y
        };

        // Запоминаем начальные координаты для плавности
        AppState.lastX = evt.clientX;
        AppState.lastY = evt.clientY;

        DOMElements.schoolMap.style.cursor = 'grabbing';
    },

    // Панорамирование
    pan(evt) {
        if (!AppState.isPanning) return;

        evt.preventDefault();

        // Используем смещение мыши для плавного перемещения
        const deltaX = evt.clientX - AppState.lastX;
        const deltaY = evt.clientY - AppState.lastY;

        // Исправление инверсии: теперь карта движется в том же направлении, что и мышь
        AppState.currentTransform.x += deltaX / AppState.currentTransform.scale;
        AppState.currentTransform.y += deltaY / AppState.currentTransform.scale;

        // Обновляем последние координаты
        AppState.lastX = evt.clientX;
        AppState.lastY = evt.clientY;

        // Применяем менее жесткие границы, позволяя перемещать карту с учетом интерфейса
        this.applyBounds();

        this.updateTransform();
    },

    // Завершение панорамирования
    stopPan() {
        AppState.isPanning = false;
        DOMElements.schoolMap.style.cursor = 'grab';
    },

    // Масштабирование
    zoom(evt) {
        evt.preventDefault();

        const delta = evt.deltaY < 0 ? 1.1 : 1/1.1;
        const point = this.getEventPoint(evt);

        // Масштабирование относительно точки под курсором
        const mouseX = point.x;
        const mouseY = point.y;

        // Вычисляем новые координаты после масштабирования
        const newX = mouseX - delta * (mouseX - AppState.currentTransform.x);
        const newY = mouseY - delta * (mouseY - AppState.currentTransform.y);

        // Обновляем масштаб и позицию
        AppState.currentTransform.x = newX;
        AppState.currentTransform.y = newY;
        AppState.currentTransform.scale *= delta;

        // Ограничение масштаба
        AppState.currentTransform.scale = Math.min(Math.max(0.5, AppState.currentTransform.scale), 3);

        // Применяем границы
        this.applyBounds();

        this.updateTransform();
    },

    // Применение менее жестких границ перемещения
    applyBounds() {
        // Убираем жесткие ограничения на перемещение, чтобы можно было сдвигать карту до краев,
        // включая области под панелью поиска и другими элементами интерфейса
        // Оставляем минимальные ограничения, чтобы карта не уходила полностью за пределы видимости
        const mapWidth = 800;
        const mapHeight = 1200;
        const containerWidth = DOMElements.mapContainer.clientWidth;
        const containerHeight = DOMElements.mapContainer.clientHeight;

        // Рассчитываем минимальные границы, чтобы карта не исчезала полностью
        const minVisibleWidth = containerWidth * 0.1; // Минимум 10% карты должно быть видно по ширине
        const minVisibleHeight = containerHeight * 0.1; // Минимум 10% карты должно быть видно по высоте

        // Максимальные значения с учетом масштаба и минимального видимого размера
        const maxX = (mapWidth * AppState.currentTransform.scale - minVisibleWidth) / 2;
        const maxY = (mapHeight * AppState.currentTransform.scale - minVisibleHeight) / 2;

        // Ограничиваем перемещение, но позволяя большую свободу
        AppState.currentTransform.x = Math.max(-maxX, Math.min(maxX, AppState.currentTransform.x));
        AppState.currentTransform.y = Math.max(-maxY, Math.min(maxY, AppState.currentTransform.y));
    },

    updateTransform() {
        DOMElements.schoolMap.setAttribute("viewBox", [
            -AppState.currentTransform.x,
            -AppState.currentTransform.y,
            800 / AppState.currentTransform.scale,
            1200 / AppState.currentTransform.scale
        ].join(" "));
    },

    centerMap() {
        const mapWidth = 800;
        const mapHeight = 1200;
        const containerWidth = DOMElements.mapContainer.clientWidth;
        const containerHeight = DOMElements.mapContainer.clientHeight;

        const scaleX = containerWidth / mapWidth;
        const scaleY = containerHeight / mapHeight;
        AppState.currentTransform.scale = Math.min(scaleX, scaleY) * 0.9;

        AppState.currentTransform.x = 0;
        AppState.currentTransform.y = 0;

        this.updateTransform();
    }
};

const DataManager = {
    async getObjectData(id) {
        const cached = lsCaching.getCachedObject(id);
        if (cached !== null) {
            return cached;
        }

        let request = await fetch(`/object-data?identifier=${id}`);
        const responseData = await request.json();
        request = await fetch(responseData.urlToImage);
        const imageBytes = await request.bytes();

        const objectData = {
            title: responseData.title,
            description: responseData.description,
            image: imageBytes,
        }
        lsCaching.saveCachedObject(id, structuredClone(objectData));
        return objectData;
    }
};

const FloorManager = {
    switchFloor(floorNumber) {
        document.querySelectorAll('.floor-layer').forEach(layer => {
            layer.style.display = 'none';
        });

        document.getElementById(`floor-${floorNumber}`).style.display = 'block';
    },

    initFloorHandlers() {
        DOMElements.floorButtons.forEach(button => {
            button.addEventListener('change', function() {
                if (this.checked) {
                    FloorManager.switchFloor(this.value);
                }
            });
        });
    }
};

const SearchManager = {
    initSearchHandler() {
        DOMElements.searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();

            document.querySelectorAll('.room').forEach(room => {
                room.style.fill = '';
            });

            DOMElements.floorButtons.forEach(button => {
                button.nextElementSibling.classList.remove('floor-searched');
            });

            if (searchTerm) {
                document.querySelectorAll('.room').forEach(room => {
                    const roomText = room.nextElementSibling ? room.nextElementSibling.textContent.toLowerCase() : '';
                    if (roomText.includes(searchTerm)) {
                        room.style.fill = '#ffff99';

                        const floorId = room.parentNode.id;
                        let floorBtn;
                        switch (floorId) {
                            case 'floor-1': floorBtn = DOMElements.floorButtons[2]; break;
                            case 'floor-2': floorBtn = DOMElements.floorButtons[1]; break;
                            case 'floor-3': floorBtn = DOMElements.floorButtons[0]; break;
                        }
                        if (floorBtn && !floorBtn.checked) {
                            floorBtn.nextElementSibling.classList.add('floor-searched');
                        }
                    }
                });
            }
        });
    }
};

const ZoomManager = {
    initZoomHandlers() {
        DOMElements.zoomInBtn.addEventListener('click', function() {
            AppState.currentTransform.scale *= 1.2;
            AppState.currentTransform.scale = Math.min(AppState.currentTransform.scale, 3);
            MapManager.applyBounds();
            MapManager.updateTransform();
        });

        DOMElements.zoomOutBtn.addEventListener('click', function() {
            AppState.currentTransform.scale /= 1.2;
            AppState.currentTransform.scale = Math.max(AppState.currentTransform.scale, 0.5);
            MapManager.applyBounds();
            MapManager.updateTransform();
        });
    }
};

const AppInitializer = {
    init() {
        DOMElements.init();

        AppState.init();

        this.initEventListeners();

        this.initComponents();

        MapManager.centerMap();

        FloorManager.switchFloor(1);
    },

    initEventListeners() {
        // Обработчики панорамирования и масштабирования SVG
        DOMElements.schoolMap.addEventListener('mousedown', MapManager.startPan.bind(MapManager));
        DOMElements.schoolMap.addEventListener('mousemove', MapManager.pan.bind(MapManager));
        DOMElements.schoolMap.addEventListener('mouseup', MapManager.stopPan.bind(MapManager));
        DOMElements.schoolMap.addEventListener('mouseleave', MapManager.stopPan.bind(MapManager));

        // Для масштабирования колесом мыши
        DOMElements.schoolMap.addEventListener('wheel', MapManager.zoom.bind(MapManager), { passive: false });

        // Обработчик закрытия карточки
        DOMElements.closeCardBtn.addEventListener('click', function() {
            DOMElements.card.style.transform = 'translateY(100vh)';
            DOMElements.card.style.transition = 'transform 0.1s ease-in';
            setTimeout(() => {
                DOMElements.card.style.transition = 'none';
                DOMElements.card.style.display = 'none';
            }, 300);
        });

        FloorManager.initFloorHandlers();
        SearchManager.initSearchHandler();
        ZoomManager.initZoomHandlers();
    },

    initComponents() {
        new SliderOfCard();

        const cardActions = new Card();
        cardActions.remove();

        document.querySelectorAll('.room').forEach(room => {
            room.addEventListener('click', async function() {
                const roomId = this.getAttribute('id');

                let identifier;
                switch(roomId) {
                    case 'room-101': identifier = 15; break;
                    case 'room-102': identifier = 16; break;
                    case 'room-103': identifier = 17; break;
                    case 'canteen': identifier = 1; break;
                    case 'toilet-male-1': identifier = 10; break;
                    case 'entrance': identifier = 3; break;
                    case 'wardrobe': identifier = 14; break;
                    case 'room-201': identifier = 15; break;
                    case 'room-205': identifier = 16; break;
                    case 'room-206': identifier = 17; break;
                    case 'toilet-fem-2': identifier = 11; break;
                    case 'sofas': identifier = 2; break;
                    case 'room-226': identifier = 15; break;
                    case 'room-301': identifier = 15; break;
                    case 'room-308': identifier = 18; break;
                    case 'room-311': identifier = 19; break;
                    case 'room-320': identifier = 20; break;
                    case 'toilet-fem-3': identifier = 12; break;
                    case 'toilet-male-3': identifier = 13; break;
                    case 'room-336': identifier = 21; break;
                    case 'main-stairs': identifier = 4; break;
                    default: identifier = -1; break;
                }

                try {
                    const objectData = await DataManager.getObjectData(identifier);
                    cardActions.fillObjectData(objectData);
                    cardActions.reveal();
                } catch (error) {
                    console.error('Ошибка при получении данных объекте:', error);
                    cardActions.title.textContent = "Информация недоступна";
                    cardActions.description.innerHTML = "К сожалению, информация об этом объекте временно недоступна.";
                    cardActions.image.src = "static/img/search-icon.svg";
                    cardActions.reveal();
                }
            });
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    AppInitializer.init();
});

class LocalStorageCaching {
    uint8ToBase64(arr) {
        let binaryString = ""
        arr.forEach((byte) => {
            binaryString += String.fromCharCode(byte)
        })
        return btoa(binaryString)
    }

    base64ToUint8(arr) {
        const binaryDecoded = atob(arr)
        const originalArray = new Uint8Array(binaryDecoded.length)
        for (let i = 0; i < binaryDecoded.length; i++) {
            originalArray[i] = binaryDecoded.charCodeAt(i)
        }
        return originalArray
    }

    getCachedObject(id) {
        const stored = localStorage.getItem(`object.${id}`)
        if (stored === null) {
            return null
        }
        const data = JSON.parse(stored)
        data.image = this.base64ToUint8(data.image)
        return data
    }

    saveCachedObject(id, object) {
        object.image = this.uint8ToBase64(object.image)
        localStorage.setItem(`object.${id}`, JSON.stringify(object))
    }
}

const lsCaching = new LocalStorageCaching()
