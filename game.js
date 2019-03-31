"use strict";

const gameCanvas = document.getElementById("game");

const logger = document.getElementById("logger");
var state = 0;
var texSize = {
  width: 50,
  height: 50
};
var screenSize = {
  width: 500,
  height: 500
};
const ctx = gameCanvas.getContext("2d");

const grass = new Image();
const furball = new Image();
const carrot = new Image();
const spike = new Image();
const brook = new Image();
const huh = new Image();
const dead = new Image();

var stuffs = [];
var levels = [];
var curLvl = 0;
var bond = null;
var totalCarrots = 0;
var levelCarrots = 0;

function log(what) {
  logger.value += "\n" + what;
}

function isReady() {
  return (state >= 8);
}

function initLevel(advance) {
  if (advance) {
    curLvl++;
  }
  
  stuffs = [];
  bond = null;
  levelCarrots = 0;
  
  var lvl = levels[curLvl];
  stuffs.push(stuff(furball, "furball", lvl.furball.x, lvl.furball.y));
  stuffs[0].alive = true;
  stuffs[0].carrots = 0;
      
  for (var i = 0; i < lvl.carrots.length; i++) {
    stuffs.push(stuff(carrot, "carrot", lvl.carrots[i].x, lvl.carrots[i].y));
  }
  
  if (!("terrains" in lvl)) {
    return;
  }
  for (var i = 0; i < lvl.terrains.length; i++) {
    var sprite;
    switch (lvl.terrains[i].name) {
      case "spike":
        sprite = spike;
        break;
      
      case "brook":
        sprite = brook;
        break;
      
      default:
        sprite = huh;
    }
    stuffs.push(stuff(sprite, lvl.terrains[i].name, lvl.terrains[i].x, lvl.terrains[i].y));
  }
}

function seeIfReadyToGo() {
  log("Something loaded");
  state++;
  if (isReady()) {
    log("Game is ready!");
    try {
      initLevel(false);

      gameLoop();
    } catch (e) {
      log("Exception: " + e);
    }
  }
}


function loadLvls() {
  // shit, write them in code first...
  fetch("levels.json").then(function(res) {
    return res.json();
  }).then(function(json) {
    levels = json;
  }).catch(function(e) {
    log("ERR: " + e);
  });
  seeIfReadyToGo();
}

function reallify(fakeX, fakeY) {
  return {
    x: fakeX * texSize.width,
    y: fakeY * texSize.height
  };
}

function tilify(realX, realY) {
  return {
    x: realX / texSize.width,
    y: realY / texSize.height
  };
}

function draw(image, x, y) {
  const rPos = reallify(x, y);
  ctx.drawImage(image, rPos.x, rPos.y, texSize.width, texSize.width);
}

function stuff(sprite, name, x, y) {
  return {
    sprite: sprite,
    name: name,
    x: x,
    y: y
  };
}

function isCrashing() {
  for (var i = 0; i < stuffs.length; i++) {
    if (stuffs[i].name != "furball") { continue; }
    else {
      var sheep = stuffs[i];
      if (!sheep.alive) { continue; }
      for (var j = 0; j < stuffs.length; j++) {
        if (stuffs[j].name == "furball") { continue; }
        var now = stuffs[j];
        if (!((sheep.x + 0.5 < now.x) ||
          (now.x + 0.5 < sheep.x) ||
          (sheep.y + 0.5 < now.y) ||
          (now.y + 0.5 < sheep.y))) {
            return {
              who: sheep,
              what: now
            };
        }
      }
    }
  }
  return null;
}

function gameLoop() {
  requestAnimationFrame(gameLoop);
  ctx.fillRect(0, 0, screenSize.width, screenSize.height);
  for (var y = 0; y < 8; y++) {
    for (var x = 0; x < 10; x++) {
      draw(grass, x, y);
    }
  }
  
  var metCarrots = false;
  for (var i = 0; i < stuffs.length; i++) {
    const thing = stuffs[i];
    draw(thing.sprite, thing.x, thing.y);
    if (thing.name == "carrot") {
      metCarrots = true;
    }
    
    if ("ax" in thing) {
      var dx = thing.ax / 5.0;
      thing.ax -= dx;
      thing.x += dx;
    }
    if ("ay" in thing) {
      var dy = thing.ay / 5.0;
      thing.ay -= dy;
      thing.y += dy;
    }
  }
  ctx.fillStyle = "#fff";
  ctx.font = "20px sans-serif";
  var textPos = {
    x: 20,
    y: 430
  };
  var lines = levels[curLvl].story.split("\n");
  for (var i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], textPos.x, textPos.y);
    textPos.y += 24;
  }
  ctx.fillStyle = "#000";
  
  var crashed = isCrashing();
  if (crashed) {
    if (crashed.what.name == "carrot") {
      // chomp chomp
      var index = stuffs.indexOf(crashed.what);
      stuffs.splice(index, 1);
      totalCarrots++;
      levelCarrots++;
      crashed.who.carrots++;
    } else if (crashed.what.name == "spike" || crashed.what.name == "brook") {
      // kill that sheep!
      crashed.who.alive = false;
      crashed.who.sprite = dead;
      bond = null;
      
      for (var i = 0; i < crashed.who.carrots; i++) {
        // generate some carrots
        var legacy = stuff(carrot, "carrot", crashed.who.x, crashed.who.y);
        var sign = Math.random() > 0.5 ? 1 : -1;
        legacy.ax = sign * Math.random() * 1.0;
        legacy.ay = sign * Math.random() * 1.0;
        stuffs.push(legacy);
      }
    }
    
    if (levelCarrots % 2 == 0 && levelCarrots != 0) {
      var newFurball = stuff(crashed.who.sprite, crashed.who.name, crashed.who.x, crashed.who.y);
      newFurball.carrots = 0;
      newFurball.alive = true;
      stuffs.push(newFurball);
      levelCarrots = 0;
    }
  }
  
  if (!metCarrots) {
    initLevel(true);
  }
}

function getMousePos(canvasDom, touch) {
  var rect = canvasDom.getBoundingClientRect();
  return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
}

gameCanvas.ontouchstart = function(e) {
  var touch = e.touches[0];
  var realPos = getMousePos(gameCanvas, touch);
  var fakePos = tilify(realPos.x, realPos.y);
  
  // 0 is always the sheep
  for (var i = 0; i < stuffs.length; i++) {
    if (stuffs[i].name == "furball") {
      var sheep = stuffs[i];
      if (!sheep.alive) { continue; }
      if (!((fakePos.x + 1.0 < sheep.x) ||
        (sheep.x + 1.0 < fakePos.x) ||
        (fakePos.y + 1.0 < sheep.y) ||
        (sheep.y + 1.0 < fakePos.y))) {
          bond = stuffs[i];
      }
    }
  }
}

gameCanvas.ontouchend = function(e) {
  bond = null;
};

gameCanvas.ontouchmove = function(e) {
  var touch = e.touches[0];
  var realPos = getMousePos(gameCanvas, touch);
  var fakePos = tilify(realPos.x, realPos.y);
  if (bond) {
    bond.x = fakePos.x;
    bond.y = fakePos.y;
  }
  
  e.preventDefault();
};

gameCanvas.onmousedown = function(e) {
  e.touches = [
    {
      clientX: e.clientX,
      clientY: e.clientY
    }
  ];
  gameCanvas.ontouchstart(e);
};

gameCanvas.onmousemove = function(e) {
  e.touches = [
    {
      clientX: e.clientX,
      clientY: e.clientY
    }
  ];
  gameCanvas.ontouchmove(e);
};

gameCanvas.onmouseup = function(e) {
  e.touches = [
    {
      clientX: e.clientX,
      clientY: e.clientY
    }
  ];
  gameCanvas.ontouchend(e);
};

log("Loading assets...");

grass.src = "grass.png";
grass.addEventListener("load", seeIfReadyToGo);
furball.src = "furball.png";
furball.addEventListener("load", seeIfReadyToGo);
carrot.src = "carrot.png";
carrot.addEventListener("load", seeIfReadyToGo);
spike.src = "spike.png";
spike.addEventListener("load", seeIfReadyToGo);
brook.src = "brook.png";
brook.addEventListener("load", seeIfReadyToGo);
huh.src = "huh.png";
huh.addEventListener("load", seeIfReadyToGo);
dead.src = "dead.png";
dead.addEventListener("load", seeIfReadyToGo);

log("Loading levels");
loadLvls();
