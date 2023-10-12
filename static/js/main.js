const app = new PIXI.Application({ 
    resizeTo: window,
    background: '0x000000',
});

// attach to the element with id canvas
document.getElementById('canvas').appendChild(app.view);

var multiplier = 0.0;
var rocket_anim_speed = 0.5;
var anim = null;

var playing = false;

PIXI.Assets.load(['/static/images/rocket-jet.json']).then(() =>
{
    // create an array of textures from an image path
    const frames = [];

    for (let i = 0; i < 30; i++)
    {
        const val = i < 10 ? `0${i}` : i;

        // magically works since the spritesheet was loaded with the pixi loader
        frames.push(PIXI.Texture.from(`rollSequence00${val}.png`));
    }

    // create an AnimatedSprite (brings back memories from the days of Flash, right ?)
    anim = new PIXI.AnimatedSprite(frames);

    /*
     * An AnimatedSprite inherits all the properties of a PIXI sprite
     * so you can change its position, its anchor, mask it, etc
     */
    anim.x = app.screen.width * 0.15;
    anim.y = app.screen.height * 0.85;
    anim.rotation = Math.PI / 2;
    anim.anchor.set(0.5, 1);
    anim.animationSpeed = rocket_anim_speed;
    anim.scale.set(0.5); // set the scale to 0.5
    // anim.play();
    // app.stage.addChild(anim);

    // Animate the rotation
    app.ticker.add((delta) =>
    {
        if (multiplier <= 10)
        {
            const mlp = (multiplier - 1) * 10/9;
            anim.rotation = (Math.PI / 2) * (1 - mlp / 10);
            var sn = Math.sin(mlp * Math.PI / 20);
            var cs = Math.cos(mlp * Math.PI / 20);
            anim.x = (app.screen.width * 0.75)*sn + app.screen.width * 0.1;
            anim.y = app.screen.height * 0.3 + (app.screen.height * 0.55)*cs;
        }
    });
});


// setup Stars
var cameraSpeed = 0.025;

(() => {
    // Get the texture for star.
    const starTexture = PIXI.Texture.from('/static/images/star.png');

    const starAmount = 500;
    let cameraZ = 0;
    const fov = 20;
    const baseSpeed = 0.025;
    let speed = 0;
    let warpSpeed = 0;

    // Create the stars
    const stars = [];

    for (let i = 0; i < starAmount; i++)
    {
        const star = {
            sprite: new PIXI.Sprite(starTexture),
            z: 0,
            x: 0,
            y: 0,
        };

        star.sprite.anchor.x = 0.5;
        star.sprite.anchor.y = 0.7;
        randomizeStar(star, true);
        app.stage.addChild(star.sprite);
        stars.push(star);
    }

    function randomizeStar(star, initial)
    {
        star.z = initial ? Math.random() * 2000 : cameraZ + Math.random() * 1000 + 2000;

        // Calculate star positions with radial random coordinate so no star hits the camera.
        const deg = Math.random() * Math.PI * 2;
        const distance = Math.random() * 50 + 1;

        star.x = Math.cos(deg) * distance;
        star.y = Math.sin(deg) * distance;
    }

    // Listen for animate update
    app.ticker.add((delta) =>
    {
        speed += (warpSpeed - speed) / 20;
        cameraZ += delta * 10 * (speed + cameraSpeed);
        for (let i = 0; i < starAmount; i++)
        {
            const star = stars[i];

            if (star.z < cameraZ) randomizeStar(star);

            const z = star.z - cameraZ;

            star.sprite.x = star.x * (fov / z) * app.renderer.screen.width + app.renderer.screen.width - 15;
            star.sprite.y = star.y * (fov / z) * app.renderer.screen.width + app.renderer.screen.height / 2;

            const dxCenter = star.sprite.x - app.renderer.screen.width / 2;
            const dyCenter = star.sprite.y - app.renderer.screen.height / 2;
            const distanceScale = Math.max(0, (2000 - z) / 2000);

            star.sprite.scale.x = distanceScale * 0.05;
            star.sprite.scale.y = distanceScale * 0.05;
            star.sprite.rotation = Math.atan2(dyCenter, dxCenter) + Math.PI / 2;

            // move the star upwards in the x direction
            if (multiplier <= 10) {
                const mlp = (multiplier - 1) * 10/9;
                var sn = Math.sin(mlp * Math.PI / 20);
                var cs = Math.cos(mlp * Math.PI / 20);
            } else {
                var sn = 1;
                var cs = 0;
            }
            star.sprite.x += (app.screen.width * 0.75) * cs;
            star.sprite.y -= (app.screen.height * 0.75) * sn;
        }
    });
})();

const multiplierText = new PIXI.Text('0.00', {
    fontFamily: 'Arial',
    fontSize: 48,
    fill: 'white',
    align: 'center',
    fontWeight: 'bold',
});

const multiplierX = new PIXI.Text('x', {
    fontFamily: 'Arial',
    fontSize: 48,
    fill: ['#ffffff', '#00ff99'],
    align: 'center',
    fontWeight: 'bold',
});

const waitingText = new PIXI.Text('Round starting in 0 seconds!', {
    fontFamily: 'Arial',
    fontSize: 18,
    fill: 'white',
    align: 'center',
    fontWeight: 'bold',
});

// center the text object
multiplierText.anchor.set(1, 0.5);
multiplierText.x = app.renderer.width / 2 + 38;
multiplierText.y = app.renderer.height / 2;

// add the x object right next to the text
multiplierX.anchor.set(0, 0.5);
multiplierX.x = app.renderer.width / 2 + 38;
multiplierX.y = app.renderer.height / 2;

waitingText.anchor.set(0.5);
waitingText.x = app.renderer.width / 2;
waitingText.y = app.renderer.height / 2;

function setWaitingText(text) {
    waitingText.text = text;
}

function show_multiplier(show = false) {
    if (show) {
        app.stage.addChild(multiplierText);
        app.stage.addChild(multiplierX);
        app.stage.removeChild(waitingText);
    } else {
        app.stage.removeChild(multiplierText);
        app.stage.removeChild(multiplierX);
        app.stage.removeChild(anim);
        anim.stop();
        playing = false;
        setWaitingText('Please wait!')
        app.stage.addChild(waitingText);
    }
}

function wait(wait_time) {
    show_multiplier(false);
    setWaitingText('Round starting in ' + wait_time + ' seconds!');
}

function custom_message(text) {
    show_multiplier(false);
    setWaitingText(text);
}

function setMultiplier(mlp) {
    if (mlp < 0) {
        mlp = 0;
    }
    multiplier = mlp;
    cameraSpeed = 0.01 + mlp * 0.025;

    // update the text with a new string
    multiplierText.text = mlp.toFixed(2);
    // set a gradient color
    if (mlp < 2) {
        multiplierX.style.fill = ['white', 'skyblue'];
    } else if (mlp < 5) {
        multiplierX.style.fill = ['skyblue', 'lightgreen'];
    } else if (mlp < 8) {
        multiplierX.style.fill = ['lightgreen', 'green'];
    } else if (mlp < 20) {
        multiplierX.style.fill = ['green', 'yellow'];
    } else if (mlp < 50) {
        multiplierX.style.fill = ['yellow', 'orange'];
    } else {
        multiplierX.style.fill = ['orange', 'red'];
    }
}

var tiktok = null;

PIXI.Assets.load('/static/images/mc.json');

function crash() {
    if (!playing) {
        console.log('already not playing');
        return;
    }
    multiplierX.style.fill = 'red'
    multiplierText.style.fill = 'red'
    clearInterval(tiktok);

    // stop the rocket
    cameraSpeed = 0.025;
    if (anim) {
        anim.stop();
        // explosion animation
        const explosionTextures = [];
        for (let i = 0; i <= 26; i++) {
            explosionTextures.push(PIXI.Texture.from(`Explosion_Sequence_A ${i + 1}.png`));
        }
        const explosion = new PIXI.AnimatedSprite(explosionTextures);
        explosion.x = anim.x + Math.sin(anim.rotation) * 100;
        explosion.y = anim.y - Math.cos(anim.rotation) * 100;
        explosion.anchor.set(0.5);
        explosion.scale.set(1);
        explosion.loop = false;
        explosion.animationSpeed = 0.4;
        explosion.onComplete = () => {
            app.stage.removeChild(explosion);
        }
        app.stage.addChild(explosion);
        app.stage.removeChild(anim);
        explosion.play();
    }
    playing = false;
}

function start() {
    if (playing) {
        console.log('already playing');
        return;
    }
    multiplierX.style.fill = 'white'
    multiplierText.style.fill = 'white'
    multiplier = 1.0;
    show_multiplier(true);
    cameraSpeed = 0.025;
    app.stage.addChild(anim);
    anim.play();
    tiktok = setInterval(function(){
        setMultiplier(multiplier + 0.003);
    }, 10);
    playing = true;
}


// setTimeout(function(){
//     crashed();
// }, Math.random() * 100000 + 1000);

window.crash = crash;
window.setMultiplier = setMultiplier;
window.start = start;
window.wait = wait;
window.custom_message = custom_message;