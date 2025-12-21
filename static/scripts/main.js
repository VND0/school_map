const AppState = {
    isPanning: false,
    showingCard: false,
    currentTransform: {x: 0, y: 0, scale: 1},
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    velocityX: 0,
    velocityY: 0,

    init() {
        this.isPanning = false;
        this.showingCard = false;
        this.currentTransform = {x: 0, y: 0, scale: 1};
        this.lastX = 0;
        this.lastY = 0;
        this.lastTime = 0;
        this.velocityX = 0;
        this.velocityY = 0;
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
    selectedRoom: null,

    init() {
        this.card = document.querySelector('.card');
        this.slider = document.querySelector('.slider');
        this.schoolMap = document.querySelector('#schoolMap');
        this.floorButtons = document.querySelectorAll('.floor-buttons input');
        this.searchInput = document.querySelector('#searchInput');
        this.zoomInBtn = document.querySelector('#zoomInBtn');
        this.zoomOutBtn = document.querySelector('#zoomOutBtn');
        this.closeCardBtn = document.querySelector('#closeCardBtn');
        this.mapContainer = document.querySelector('.map-container');
        this.selectedRoom = null;
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

    endDrag() {
        this.dragging = false;

        DOMElements.card.style.transition = 'transform 0.3s ease';

        if (this.currentY > 200) {
            DOMElements.selectedRoom.classList.remove('room-selected');
            DOMElements.selectedRoom = null;
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
        this.title = DOMElements.card.querySelector('h2');
        this.image = DOMElements.card.querySelector('img');
        this.description = DOMElements.card.querySelector('.description');
    }

    remove() {
        DOMElements.card.style.transform = 'translateY(100vh)';
        DOMElements.card.style.display = 'none';
    }

    reveal() {
        DOMElements.card.style.removeProperty('display');
        DOMElements.card.style.transform = 'translateY(100vh)';
        DOMElements.card.style.transition = 'transform 0.3s ease-out';
        DOMElements.card.getBoundingClientRect();
        DOMElements.card.style.transform = 'translateY(0)';
        setTimeout(() => {
            DOMElements.card.style.removeProperty('transition');
        }, 300);
    }

    fillObjectData(objectData) {
        this.title.textContent = objectData.title;
        this.description.innerHTML = objectData.description;

        if (objectData.image && objectData.image.byteLength > 0) {
            const blob = new Blob([objectData.image], {type: 'application/octet-stream'});
            this.image.src = URL.createObjectURL(blob);
        } else {
            this.image.src = 'static/img/search-icon.svg';
        }
    }
}

const MapManager = {
    startPan(e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;

        e.target.setPointerCapture(e.pointerId);

        AppState.isPanning = true;
        AppState.lastX = e.clientX;
        AppState.lastY = e.clientY;
        AppState.lastTime = performance.now();
        AppState.velocityX = AppState.velocityY = 0;

        DOMElements.schoolMap.style.cursor = 'grabbing';
    },

    pan(e) {
        if (!AppState.isPanning) return;

        e.preventDefault();

        const MAX_SPEED = 1.5;
        const ALPHA = 0.2;

        const scaleFactor = 1 / AppState.currentTransform.scale;
        const currTime = performance.now();

        const ctm = DOMElements.schoolMap.getScreenCTM();

        const deltaX = (e.clientX - AppState.lastX) / ctm.a;
        const deltaY = (e.clientY - AppState.lastY) / ctm.d;
        const deltaT = Math.max(16, currTime - AppState.lastTime);

        const vx = deltaX / deltaT * scaleFactor;
        const vy = deltaY / deltaT * scaleFactor;

        AppState.currentTransform.x += deltaX;
        AppState.currentTransform.y += deltaY;

        AppState.velocityX = Math.max(
            -MAX_SPEED,
            Math.min(MAX_SPEED, AppState.velocityX * (1 - ALPHA) + vx * ALPHA)
        );
        AppState.velocityY = Math.max(
            -MAX_SPEED,
            Math.min(MAX_SPEED, AppState.velocityY * (1 - ALPHA) + vy * ALPHA)
        );

        AppState.lastX = e.clientX;
        AppState.lastY = e.clientY;
        AppState.lastTime = currTime;

        this.updateTransform();
    },

    stopPan(e) {
        AppState.isPanning = false;

        if (e?.pointerId) {
            e.target.releasePointerCapture(e.pointerId);
        }

        DOMElements.schoolMap.style.cursor = 'grab';

        if (Math.abs(AppState.velocityX) > 0.4 || Math.abs(AppState.velocityY) > 0.4) {
            requestAnimationFrame(this.inertiaStep.bind(this));
        }
    },

    inertiaStep() {
        AppState.velocityX *= 0.95;
        AppState.velocityY *= 0.95;

        AppState.currentTransform.x += AppState.velocityX * 8;
        AppState.currentTransform.y += AppState.velocityY * 8;

        this.updateTransform();

        if ((Math.abs(AppState.velocityX) > 0.01 || Math.abs(AppState.velocityY) > 0.01) && !AppState.isPanning) {
            requestAnimationFrame(this.inertiaStep.bind(this));
        }
    },

    zoom(e) {
        e.preventDefault();

        const delta = e.deltaY < 0 ? 1.1 : 1 / 1.1;

        const mouseX = e.clientX;
        const mouseY = e.clientY;

        const newX = mouseX - delta * (mouseX - AppState.currentTransform.x);
        const newY = mouseY - delta * (mouseY - AppState.currentTransform.y);

        AppState.currentTransform.x = newX;
        AppState.currentTransform.y = newY;
        AppState.currentTransform.scale *= delta;

        AppState.currentTransform.scale = Math.min(Math.max(0.5, AppState.currentTransform.scale), 3);

        this.applyBounds();
        this.updateTransform();
    },

    applyBounds() {
        const mapWidth = 800;
        const mapHeight = 1200;
        const containerWidth = DOMElements.mapContainer.clientWidth;
        const containerHeight = DOMElements.mapContainer.clientHeight;

        const minVisibleWidth = containerWidth * 0.1;
        const minVisibleHeight = containerHeight * 0.1;

        const maxX = (mapWidth * AppState.currentTransform.scale - minVisibleWidth) / 2;
        const maxY = (mapHeight * AppState.currentTransform.scale - minVisibleHeight) / 2;

        AppState.currentTransform.x = Math.max(-maxX, Math.min(maxX, AppState.currentTransform.x));
        AppState.currentTransform.y = Math.max(-maxY, Math.min(maxY, AppState.currentTransform.y));
    },

    updateTransform() {
        DOMElements.schoolMap.setAttribute('viewBox', [
            -AppState.currentTransform.x,
            -AppState.currentTransform.y,
            800 / AppState.currentTransform.scale,
            1200 / AppState.currentTransform.scale
        ].join(' '));
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

        document.querySelector(`#floor-${floorNumber}`).style.display = 'block';

        const mainStairs = document.querySelector('#main-stairs');
        const mainStairsText = mainStairs.nextElementSibling;

        if (floorNumber !== '1') {
            mainStairs.setAttribute('x', '650');
            mainStairsText.setAttribute('x', '680');
        }
        else {
            mainStairs.setAttribute('x', '730');
            mainStairsText.setAttribute('x', '760');
        }
    },

    initFloorHandlers() {
        DOMElements.floorButtons.forEach(button => {
            button.addEventListener('change', function () {
                if (this.checked) {
                    FloorManager.switchFloor(this.value);
                }
            });
        });
    }
};

const SearchManager = {
    initSearchHandler() {
        DOMElements.searchInput.addEventListener('input', function () {
            const searchTerm = this.value.toLowerCase();

            document.querySelectorAll('.room').forEach(room => {
                room.style.fill = '';
            });

            DOMElements.floorButtons.forEach(button => {
                button.nextElementSibling.style.backgroundColor = 'white';
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
                        if (floorBtn) {
                            floorBtn.nextElementSibling.style.backgroundColor = '#ffff99';
                        }
                    }
                });
            }
        });
    }
};

const ZoomManager = {
    initZoomHandlers() {
        DOMElements.zoomInBtn.addEventListener('click', function () {
            AppState.currentTransform.scale *= 1.2;
            AppState.currentTransform.scale = Math.min(AppState.currentTransform.scale, 3);
            MapManager.applyBounds();
            MapManager.updateTransform();
        });

        DOMElements.zoomOutBtn.addEventListener('click', function () {
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

        FloorManager.switchFloor('1');
    },

    initEventListeners() {
        DOMElements.schoolMap.addEventListener('pointerdown', MapManager.startPan.bind(MapManager));
        DOMElements.schoolMap.addEventListener('pointermove', MapManager.pan.bind(MapManager));
        DOMElements.schoolMap.addEventListener('pointerup', MapManager.stopPan.bind(MapManager));

        DOMElements.schoolMap.addEventListener('wheel', MapManager.zoom.bind(MapManager), {passive: false});

        DOMElements.closeCardBtn.addEventListener('click', function () {
            DOMElements.selectedRoom.classList.remove('room-selected');
            DOMElements.selectedRoom = null;

            DOMElements.card.style.transform = 'translateY(100vh)';
            DOMElements.card.style.transition = 'transform 0.25s ease-in';
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
            room.addEventListener('click', async function () {
                const roomId = this.getAttribute('id');

                let identifier;
                switch(roomId) {
                    case 'canteen': identifier = 1; break;
                    case 'sofas': identifier = 2; break;
                    case 'entrance': identifier = 3; break;
                    case 'main-stairs': identifier = 4; break;
                    case 'secondary-stairs': identifier = 5; break;
                    case 'toilet-male-1': identifier = 6; break;
                    case 'toilet-female-2': identifier = 7; break;
                    case 'toilet-female-3': identifier = 8; break;
                    case 'toilet-male-3': identifier = 9; break;
                    case 'wardrobe': identifier = 10; break;
                    case 'room-226': identifier = 11; break;
                    case 'room-205': identifier = 12; break;
                    case 'room-206': identifier = 13; break;
                    case 'room-308': identifier = 14; break;
                    case 'room-311': identifier = 15; break;
                    case 'room-320': identifier = 16; break;
                    case 'room-336': identifier = 17; break;
                    default: identifier = -1; break;
                }

                try {
                    const objectData = await DataManager.getObjectData(identifier);

                    DOMElements.selectedRoom = document.querySelector(`#${roomId}`);
                    DOMElements.selectedRoom.classList.add('room-selected');

                    cardActions.fillObjectData(objectData);
                    cardActions.reveal();
                } catch (error) {
                    console.error('Ошибка при получении данных объекте:', error);
                    cardActions.title.textContent = 'Информация недоступна';
                    cardActions.description.innerHTML = 'К сожалению, информация об этом объекте временно недоступна.';
                    cardActions.image.src = 'static/img/search-icon.svg';
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
        let binaryString = ''
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

class QrReader {
    constructor() {
        this.html5QrCode = new Html5Qrcode('qr-reader')
        this.scanning = false

        this.container = document.querySelector(".scanner-container")
        this.cameraBtn = this.container.querySelector('#camera-btn')

        this.openBtn = document.querySelector("#qr-button")
        this.closeBtn = this.container.querySelector(".close-btn")

        this.openBtn.addEventListener("click", this.openWidget)
        this.cameraBtn.addEventListener('click', this.startCameraScan)
        this.closeBtn.addEventListener("click", this.closeWidget)

        this.errorDiv = this.container.querySelector("#qr-error")
    }

    onScanSuccess = async (decodedText) => {
        await this.stopCameraScan()

        const mapObject = document.querySelector("#schoolMap")
        mapObject.childNodes.forEach((node) => {
            node.childNodes.forEach(async (obj) => {
                if (obj.id === decodedText) {
                    const floorId = node.id
                    let floorNumber;
                    if (floorId === "floor-1") {
                        floorNumber = '1'
                    } else if (floorId === "floor-2") {
                        floorNumber = '2'
                    } else if (floorId === "floor-3") {
                        floorNumber = '3'
                    }
                    if (floorNumber !== undefined) {
                        document.querySelector(`.floor-buttons > input[value="${floorNumber}"]`).click()
                        obj.dispatchEvent(new MouseEvent('click', {
                            view: window,
                            bubbles: true,
                            cancelable: true
                        }))
                        await this.closeWidget()
                    }
                }
            })
        })

        this.showError(`Объекта с id ${decodedText} не существует`)
    }

    stopCameraScan = async () => {
        await this.html5QrCode.stop()
        this.scanning = false
        this.cameraBtn.textContent = 'Сканировать'
        this.cameraBtn.removeEventListener('click', this.stopCameraScan)
        this.cameraBtn.addEventListener('click', this.startCameraScan)
        this.cameraBtn.classList.remove("activated")
        this.cameraBtn.classList.add("deactivated")
    }

    startCameraScan = async () => {
        let devices
        try {
            devices = await Html5Qrcode.getCameras()
            if (!devices || devices.length === 0) {
                this.showError("Камеры не найдены")
                return
            }
        } catch (error) {
            this.showError(error)
            return
        }

        const backCamera = devices.find(d => /back|rear|environment/i.test(d.label)) || devices[0]

        await this.html5QrCode.start(
            {deviceId: {exact: backCamera.id}},
            {
                fps: 10,
                qrbox: {width: 250, height: 250},
                aspectRatio: 1.0
            },
            this.onScanSuccess
        )

        this.scanning = true;
        this.cameraBtn.textContent = "Остановить"
        this.cameraBtn.removeEventListener("click", this.startCameraScan)
        this.cameraBtn.addEventListener("click", this.stopCameraScan)
        this.cameraBtn.classList.remove("deactivated")
        this.cameraBtn.classList.add("activated")
    }

    openWidget = async () => {
        this.container.style.display = "block"
    }

    closeWidget = async () => {
        if (this.scanning) {
            await this.stopCameraScan()
        }
        this.container.style.display = "none"
    }

    showError = async (error) => {
        this.errorDiv.textContent = error
        this.errorDiv.classList.add("has-error")
        setTimeout(() => {
            this.errorDiv.textContent = ""
            this.errorDiv.classList.remove("has-error")
        }, 5000)
    }
}

const lsCaching = new LocalStorageCaching()
const qrReader = new QrReader()
