"use strict";

const gameCanvas = document.getElementById("game");

const logger = document.getElementById("logger");
let state = 0;
let texSize = {
  width: 50,
  height: 50
};
let screenSize = {
  width: 500,
  height: 500
};
let levelSize = {
  width: 10,
  height: 8
};
const ctx = gameCanvas.getContext("2d");

const grass = new Image();
const furball = new Image();
const carrot = new Image();
const spike = new Image();
const brook = new Image();
const huh = new Image();
const dead = new Image();
const whirl = new Image();

let stuffs = [];
let levels = [];
let curLvl = 0;
let bond = null;
let totalCarrots = 0;
let prevTotalCarrots = 0;
let levelCarrots = 0;
let crashed = null;
let line = null;
let dPos = null;
let carrotsToNextFurball = 2;

function log(what) {
  logger.value += "\n" + what;
}

function isReady() {
  return (state >= 9);
}

function initLevel(advance) {
  if (advance) {
    prevTotalCarrots = totalCarrots;
    curLvl++;
  } else {
    totalCarrots = prevTotalCarrots;
  }
  
  stuffs = [];
  bond = null;
  levelCarrots = 0;
  line = null;
  dPos = null;
  crashed = null;
  carrotsToNextFurball = 2;
  
  let lvl = levels[curLvl];
  let mainFurball = stuff(furball, "furball", lvl.furball.x, lvl.furball.y);
  mainFurball.alive = true;
  mainFurball.carrots = totalCarrots;
      
  for (let i = 0; i < lvl.carrots.length; i++) {
    stuffs.push(stuff(carrot, "carrot", lvl.carrots[i].x, lvl.carrots[i].y));
  }
  
  if (!("terrains" in lvl)) {
    return;
  }
  for (let i = 0; i < lvl.terrains.length; i++) {
    let sprite;
    switch (lvl.terrains[i].name) {
      case "spike":
        sprite = spike;
        break;
      
      case "brook":
        sprite = brook;
        break;

      case "whirl":
        sprite = whirl;
        break;
      
      default:
        sprite = huh;
    }
    stuffs.push(stuff(sprite, lvl.terrains[i].name, lvl.terrains[i].x, lvl.terrains[i].y));
  }

  stuffs.push(mainFurball);
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
  fetch("levels.txt").then(function(res) {
    res.body.getReader().read().then(function (content) {
      let str = new TextDecoder("utf-8").decode(content.value);
      let gotLines = str.split("\n");
      let numLevels = Math.floor(gotLines.length / 9);

      for (let i = 0; i < numLevels; i++) {
        let story = gotLines[i * 9 + 8];
        let furball = null;
        let carrots = [];
        let terrains = [];
        for (let y = 0; y < levelSize.height; y++) {
          for (let x = 0; x < gotLines[i * 9 + y].length; x++) {
            switch (gotLines[i * 9 + y][x]) {
              case 'o':
                furball = {
                  x: x,
                  y: y,
                  name: "furball"
                };
                break;

              case '!':
                carrots.push({
                  x: x,
                  y: y,
                  name: "carrot"
                });
                break;

              case '~':
                terrains.push({
                  x: x,
                  y: y,
                  name: "brook"
                });
                break;

              case '^':
                terrains.push({
                  x: x,
                  y: y,
                  name: "spike"
                });
                break;

              case '+':
                terrains.push({
                  x: x,
                  y: y,
                  name: "whirl"
                });
                break;
            }
          }
        }
        levels.push({
          furball: furball,
          carrots: carrots,
          terrains: terrains,
          story: story,
        });
      }
      seeIfReadyToGo();
    });
  }).catch(function(e) {
    log("ERR: " + e);
  });
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
  let ret = null;
  for (let i = 0; i < stuffs.length; i++) {
    if (stuffs[i].name != "furball") { continue; }
    else {
      let sheep = stuffs[i];
      if (!sheep.alive) { continue; }
      for (let j = 0; j < stuffs.length; j++) {
        if (stuffs[j].name == "furball" && stuffs[j].alive) { continue; }
        let now = stuffs[j];
        
        if (!((sheep.x + 0.5 < now.x) ||
          (now.x + 0.5 < sheep.x) ||
          (sheep.y + 0.5 < now.y) ||
          (now.y + 0.5 < sheep.y))) {
          if (now.name == "spike" || now.name == "brook" || now.name == "whirl") {
            let kill = true;
            if (sheep.ax || sheep.ay) {
              if ((Math.abs(sheep.ax) >= 0.1 || Math.abs(sheep.ay) >= 0.1) && now.name != "whirl") {
                kill = false;
              }
            }
            
            if (kill) {
              // kill that sheep!
              sheep.alive = false;
              sheep.sprite = dead;
              bond = null;
              
              for (let i = 0; i < sheep.carrots; i++) {
                // generate some carrots
                let legacy = stuff(carrot, "carrot", sheep.x, sheep.y);
                let sign = Math.random() > 0.5 ? 1 : -1;
                let sign2 = Math.random() > 0.5 ? 1 : -1;
                legacy.ax = sign * Math.random() * 1.0;
                legacy.ay = sign2 * Math.random() * 1.0;
                stuffs.push(legacy);
              }
              continue;
            }
          }
          if (ret && ret.what.name == "furball" && now.name != "carrot") {
            // nope, firstify furball
            continue;
          }
          ret = {
            who: sheep,
            what: now
          };
          if (ret.what.name == "carrot") { return ret; }
        }
      }
    }
  }
  return ret;
}

function gameLoop() {
  requestAnimationFrame(gameLoop);
  ctx.fillRect(0, 0, screenSize.width, screenSize.height);
  for (let y = 0; y < levelSize.height; y++) {
    for (let x = 0; x < levelSize.width; x++) {
      draw(grass, x, y);
    }
  }
  
  let metCarrots = false;
  for (let i = 0; i < stuffs.length; i++) {
    const thing = stuffs[i];
    draw(thing.sprite, thing.x, thing.y);
    if (thing.name == "carrot") {
      metCarrots = true;
    }
    
    if ("ax" in thing) {
      let dx = thing.ax / 5.0;
      thing.ax -= dx;
      thing.x += dx;
    }
    if ("ay" in thing) {
      let dy = thing.ay / 5.0;
      thing.ay -= dy;
      thing.y += dy;
    }
  }
  ctx.fillStyle = "#fff";
  ctx.font = "20px sans-serif";
  let textPos = {
    x: 20,
    y: 430
  };
  let lines = levels[curLvl].story.split("\\n");
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], textPos.x, textPos.y);
    textPos.y += 24;
  }
  ctx.fillStyle = "#000";
  
  if (line) {
    ctx.beginPath();
    ctx.moveTo(line[0].x, line[0].y);
    for (let i = 1; i < line.length; i++) {
      ctx.lineTo(line[i].x, line[i].y);
    }
    ctx.stroke();
  }
  
  crashed = isCrashing();
  if (crashed) {
    if (crashed.what.name == "carrot") {
      // chomp chomp
      let index = stuffs.indexOf(crashed.what);
      stuffs.splice(index, 1);
      totalCarrots++;
      levelCarrots++;
      crashed.who.carrots++;
    }
    
    if (levelCarrots % carrotsToNextFurball == 0 && levelCarrots != 0) {
      let newFurball = stuff(crashed.who.sprite, crashed.who.name, crashed.who.x, crashed.who.y);
      newFurball.carrots = 0;
      newFurball.alive = true;
      stuffs.push(newFurball);
      levelCarrots = 0;
      carrotsToNextFurball += 2;
    }
  }
  
  if (!metCarrots) {
    initLevel(true);
  }
}

function getMousePos(canvasDom, touch) {
  let rect = canvasDom.getBoundingClientRect();
  return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
}

gameCanvas.ontouchstart = function(e) {
  let touch = e.touches[0];
  let realPos = getMousePos(gameCanvas, touch);
  let fakePos = tilify(realPos.x, realPos.y);
  bond = null;
  
  // 0 is always the sheep
  for (let i = 0; i < stuffs.length; i++) {
    if (stuffs[i].name == "furball") {
      let sheep = stuffs[i];
      if (!sheep.alive) { continue; }
      if (!((fakePos.x + 0.01 < sheep.x) ||
        (sheep.x + 1.0 < fakePos.x) ||
        (fakePos.y + 0.01 < sheep.y) ||
        (sheep.y + 1.0 < fakePos.y))) {
          dPos = {
            x: sheep.x - fakePos.x,
            y: sheep.y - fakePos.y
          };
          bond = stuffs[i];
      }
    }
  }
}

gameCanvas.ontouchend = function(e) {
  let touch = e.touches[0];

  if (line && bond) {
    let realPos = line[0];
    let fakePos = tilify(realPos.x, realPos.y);

    let dx = fakePos.x - bond.x;
    let dy = fakePos.y - bond.y;
    bond.ax = -dx / 1.0;
    bond.ay = -dy / 1.0;
    line = null;
  }

  bond = null;
  dPos = null;
};

gameCanvas.ontouchmove = function(e) {
  let touch = e.touches[0];
  let realPos = getMousePos(gameCanvas, touch);
  let fakePos = tilify(realPos.x, realPos.y);
  
  if (bond) {
    if (crashed && crashed.who == bond && crashed.what.name == "furball") {
      // crashed a dead furball!
      
      let furballRealPos = reallify(crashed.who.x, crashed.who.y);
      furballRealPos.x -= texSize.width * dPos.x;
      furballRealPos.y -= texSize.height * dPos.y;
      line = [
        realPos,
        furballRealPos
      ];
      
    } else {
      line = null;
      bond.x = fakePos.x + dPos.x;
      bond.y = fakePos.y + dPos.y;
    }
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
whirl.src = "whirl.png";
whirl.addEventListener("load", seeIfReadyToGo);

log("Loading levels");
loadLvls();
