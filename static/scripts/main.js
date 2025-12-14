const card = document.querySelector(".card")
const slider = document.querySelector(".slider")


class SliderOfCard {
    constructor() {
        this.startY = 0;
        this.currentY = 0;
        this.dragging = false;

        this.startDrag = this.startDrag.bind(this);
        this.onDrag = this.onDrag.bind(this);
        this.endDrag = this.endDrag.bind(this);

        slider.addEventListener('pointerdown', this.startDrag);
    }

    startDrag(e) {
        this.dragging = true;
        this.startY = e.clientY;

        card.style.transition = 'none';

        slider.setPointerCapture(e.pointerId);

        slider.addEventListener('pointermove', this.onDrag);
        slider.addEventListener('pointerup', this.endDrag);
        slider.addEventListener('pointercancel', this.endDrag);
    }

    onDrag(e) {
        if (!this.dragging) return;

        this.currentY = e.clientY - this.startY;

        if (this.currentY > 0) {
            card.style.transform = `translateY(${this.currentY}px)`;
        }
    }

    endDrag(e) {
        this.dragging = false;

        card.style.transition = 'transform 0.3s ease';

        if (this.currentY > 200) {
            card.style.transform = 'translateY(100vh)';
            setTimeout(() => {
                card.style.display = 'none';
            }, 300);
        } else {
            card.style.transform = 'translateY(0)';
        }

        this.currentY = 0;

        slider.removeEventListener('pointermove', this.onDrag);
        slider.removeEventListener('pointerup', this.endDrag);
        slider.removeEventListener('pointercancel', this.endDrag);
    }
}


class Card {
    constructor() {
        this.title = card.querySelector("h2")
        this.image = card.querySelector("img")
        this.description = card.querySelector(".description")
    }

    remove() {
        card.style.transform = 'translateY(100vh)';
        card.style.display = "none";
    }

    reveal() {
        card.style.removeProperty("display");
        card.style.transform = "translateY(100vh)";
        card.style.transition = "transform 0.3s ease";
        card.getBoundingClientRect();
        card.style.transform = "translateY(0)";
        setTimeout(() => {
            card.style.removeProperty("transition");
        }, 300);
    }

    fillObjectData(objectData) {
        this.title.textContent = objectData.title
        this.description.innerHTML = objectData.description

        const blob = new Blob([objectData.image])
        this.image.src = URL.createObjectURL(blob)
    }

    clearCard() {
        this.title.textContent = ""
        this.description.textContent = ""
        this.image.src = ""
    }
}

const getObjectData = async function (id) {
    let request = await fetch(`/object-data?identifier=${id}`)
    const responseData = await request.json()
    request = await fetch(responseData.urlToImage)
    const imageBytes = await request.bytes()

    return {
        title: responseData.title,
        description: responseData.description,
        image: imageBytes,
    }
}

new SliderOfCard();
const cardActions = new Card();
cardActions.remove()

getObjectData(-1).then((objectData) => {
    cardActions.fillObjectData(objectData)
    cardActions.reveal()

    setTimeout(() => cardActions.clearCard(), 3000)
})

