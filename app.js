import * as util from "./util.js";
import { V } from "./util.js";


/*
async function hash(s) {
    s = String(s);
    const utf8 = new TextEncoder().encode(s);
    const hashBuffer = await crypto.subtle.digest("SHA-256", utf8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    return hashHex;
}
*/


let id = window.localStorage.getItem("id");
if (id == null || id.includes(",")) id = new Array(64).fill(null).map(_ => util.BASE64[Math.floor(64*Math.random())]).join("");
const ACCOUNTID = id;
window.localStorage.setItem("id", id);

const SOCKET = io("https://merge-db.jfancode.repl.co/");

const QUALITY = 3;

function brighten(c, b) {
    c = new util.Color(c);
    if (b < 0) return util.lerp(c, new util.Color(0, 0, 0, c.a) -b);
    if (b > 0) return util.lerp(c, new util.Color(255, 255, 255, c.a), b);
    return c;
}
const APPTHEME = {
    LIGHT: {
        BG: [239, 231, 215],
        FG: [66, 56, 83],
        ACCENT: [226, 66, 87],
    },
    DARK: {
        BG: [15, 18, 30],
        FG: [139, 130, 140],
        ACCENT: [],
    },
};
for (let mode in APPTHEME)
    for (let type in APPTHEME[mode])
        APPTHEME[mode][type] = new util.Color(APPTHEME[mode][type]);
const APPTHEMELERP = 0.25;
APPTHEME.DARK.ACCENT = util.lerp(APPTHEME.LIGHT.ACCENT, APPTHEME.DARK.BG, APPTHEMELERP);
const THEME = {
    1: [209, 61, 81],
    2: [255, 122, 93],
    3: [255, 167, 89],
    4: [139, 179, 98],
    5: [75, 173, 142],
    6: [43, 138, 165],
    7: [46, 104, 190],
    8: [155, 86, 190],
    9: [196, 86, 190],
    10: [231, 153, 192],
    11: [223, 207, 231],
    12: [255, 255, 255],
    13: [160, 156, 169],
    14: [66, 56, 83],
    15: [0, 0, 0],
};
const THEME2 = {
    15: [255, 255, 255],
};
for (let type in THEME) THEME[type] = new util.Color(THEME[type]);
for (let type in THEME2) THEME2[type] = new util.Color(THEME2[type]);
const THEME2DEFAULT = new util.Color(0, 0, 0, 0.25);
function radialPoly(p, dr) {
    return util.ensure(dr, "arr").map(dr => {   
        dr = util.ensure(dr, "obj");
        let d = dr.d, r = dr.r;
        return V.dir(d, r).add(p);
    });
}
function circularPoly(p, r, d) {
    return radialPoly(p, util.ensure(d, "arr").map(d => { return { d: d, r: r }; }));
}
function regularPolygon(p, n, r, d) {
    return circularPoly(p, r, Array.from(new Array(n).keys()).map(i => util.lerp(0, 360, i/n)+d));
}
function confirmShape(shape) {
    shape = util.ensure(shape, "arr").map(arr => util.ensure(arr, "arr").map(v => new V(v)));
    let mxx = -Infinity, mnx = +Infinity;
    let mxy = -Infinity, mny = +Infinity;
    shape.forEach(arr => {
        arr.forEach(v => {
            mxx = Math.max(mxx, v.x);
            mnx = Math.min(mnx, v.x);
            mxy = Math.max(mxy, v.y);
            mny = Math.min(mny, v.y);
        });
    });
    let centerx = (mxx+mnx) / 2;
    let centery = (mxy+mny) / 2;
    let w = mxx-mnx, h = mxy-mny;
    let scale = Math.min(1/w, 1/h);
    return shape.map(arr => arr.map(v => v.sub(centerx, centery).mul(scale)));
}
const SHAPES = {
    1: [regularPolygon(0, 4, 1, 45)],
    2: [regularPolygon(0, 60, 1, 0)],
    3: [regularPolygon(0, 3, 1, 90)],
    4: [regularPolygon(0, 4, 1, 0)],
    5: [regularPolygon(0, 5, 1, 90)],
    6: [
        radialPoly(0, Array.from(new Array(10).keys()).map(i => {
            let d = util.lerp(0, 360, i/10)+90;
            let r = (i%2 == 0) ? 30 : 15;
            return { d: d, r: r };
        })),
    ],
    7: [
        (() => {
            let headR = V.dir(45, 1);
            let headL = V.dir(135, 1);
            let arr = [];
            for (let i = -45; i <= 135; i += 5)
                arr.push(headR.add(V.dir(i, 1)));
            for (let i = 45; i <= 225; i += 5)
                arr.push(headL.add(V.dir(i, 1)));
            arr.push(V.dir(-90, Math.sqrt(2)));
            return arr;
        })(),
    ],
    8: [
        regularPolygon(0, 4, 1, 45).map(p => {
            p.x += p.y*0.25;
            return p;
        }),
    ],
    9: [regularPolygon(0, 6, 1, 90)],
    10: [
        (() => {
            let d = 60;
            let arr = [];
            for (let i = 0; i <= 360-2*d; i += 5)
                arr.push(V.dir((90-d) - i, 1));
            arr.push(new V(0, 1/util.cos(d)));
            return arr;
        })(),
    ],
    11: [
        regularPolygon(0, 60, 1, 0),
        regularPolygon(0, 60, 0.5, 0),
    ],
    12: [
        (() => {
            let w = 1, h = 0.25, d = 45;
            let arr = [];
            for (let i = 0; i < 4; i++) {
                d += 90;
                arr.push(V.dir(d, h/2).add(V.dir(d-90, h/2)));
                arr.push(V.dir(d, w/2).add(V.dir(d-90, h/2)));
                arr.push(V.dir(d, w/2).add(V.dir(d+90, h/2)));
            }
            return arr;
        })(),
    ],
    13: [
        circularPoly(0, 1, Array.from(new Array(60).keys()).map(i => util.lerp(0, 180, i/60))),
    ],
    14: [
        (() => {
            let d = 60, h = 1;
            let r = Math.sqrt(1 + h*h - 2*h*util.cos(d));
            let d2 = (180/Math.PI) * Math.acos((1 - (r*r + h*h)) / (-2*r*h));
            let arr = [];
            for (let i = 0; i <= 360-2*d; i += 5)
                arr.push(V.dir((90-d) - i, 1));
            for (let i = 0; i <= 2*d2; i += 5)
                arr.push(V.dir((-90-d2) + i, r).add(0, h));
            return arr;
        })(),
    ],
    15: [
        [[+1, -1], [+1, 1], [+0.5, 0], [0, 1], [-0.5, 0], [-1, 1], [-1, -1]].map(v => {
            v = new V(v);
            v.y *= 0.75;
            return v;
        }),
    ],
};
for (let type in SHAPES) SHAPES[type] = confirmShape(SHAPES[type]);
const SHAPESCALES = {
    6: 1.25,
};

export default class App extends util.Target {
    #canvas;
    #ctx;

    #theme;

    #history;
    #mode;
    
    #game;
    #maxScore;
    
    #demoGame1;
    #demoGame2;

    #eStyle;

    #eScore;
    #eMoves;
    #eInfoTiles;

    #eFastButton;
    #eQuitButton;

    #eGameBoardButton;
    #eGameHelpButton;
    #eGameThemeButton;

    #ePlayButton;
    #eBoardButton;
    #eHelpButton;
    #eThemeButton;
    
    #eFinish;
    #eFinishIcon;
    #eFinishScore;
    #eFinishMoves;
    #eNewBest;

    #eBoardBackButton;
    #eBoardEntries;
    #eBoardNoEntries;
    #eBoardNoInternet;
    #eBoardYouTop;
    #eBoardYouBottom;

    #eHelpBackButton;

    constructor() {
        super();

        this.#canvas = null;
        this.#ctx = null;

        this.#theme = null;

        this.#history = [];
        this.#mode = null;

        this.#game = new App.Game(this, this);
        this.game.addHandler("change", c => this.post("change", "game."+c));

        this.#demoGame1 = new App.Game(this);
        this.#demoGame2 = new App.Game(this);

        this.theme = "LIGHT";

        this.mode = "title";

        this.start();
        this.addHandler("change", c => this.fullSave());

        setInterval(async () => {
            if (this.mode != "board") return;
            nentries = await this.emitScores();
            await this.emitScore();
        }, 3000);
        this.addHandler("change", async c => {
            if (c != "mode") return;
            if (this.mode == "finish" || this.mode == "board") {
                nentries = await this.emitScores();
                await this.emitScore();
            }
        });

        let t0 = 0, score = 0, moves = 0;
        let entries = [], nentries = [];
        let timer = 0;
        this.addHandler("update", () => {
            if (this.mode == "game") {
                if (this.game.moves > 0 && this.game.canTrigger)
                    if (!this.game.canMerge)
                        if (this.hasEQuitButton())
                            this.eQuitButton.click();
                if (timer > 100) timer -= this.game.TICKSPEED;
                else if (this.game.canTrigger && 0) {
                    timer = 0;
                    const shifts = [[+1,0],[-1,0],[0,+1],[0,-1]];
                    let merges = [];
                    for (let x = 0; x < this.game.w; x++) {
                        for (let y = 0; y < this.game.h; y++) {
                            let r = new Array(this.game.w).fill(null).map(_ => new Array(this.game.h).fill(false));
                            let tiles = [];
                            const dfs = (x, y, t) => {
                                if (x < 0 || x >= this.game.w) return;
                                if (y < 0 || y >= this.game.h) return;
                                if (r[x][y]) return;
                                r[x][y] = true;
                                let txy = this.game.getTile(x, y).basicType;
                                if (txy != t) return;
                                tiles.push([x, y]);
                                shifts.forEach(([sx, sy]) => dfs(x+sx, y+sy, t));
                            };
                            let txy = this.game.getTile(x, y).basicType;
                            dfs(x, y, txy);
                            if (tiles.length <= 1) continue;
                            let neighbors = 0;
                            shifts.forEach(([sx, sy], i) => {
                                let x2 = x+sx, y2 = y+sy;
                                if (x2 < 0) return;
                                if (x2 >= this.game.w) return;
                                if (y2 < 0) return;
                                if (y2 >= this.game.h) return;
                                let txy2 = this.game.getTile(x2, y2).basicType;
                                // if (txy2 != txy+1) return;
                                // neighbors += [1, 1, 1, 3][i];
                                if (txy2 > txy+1) neighbors += [1, 1, 1, 3][i];
                                else if (txy2 < txy+1) neighbors -= [2, 2, 2, 6][i];
                                else neighbors += [2, 2, 2, 6][i];
                            });
                            merges.push({
                                type: this.game.getTile(x, y).basicType,
                                neighbors: neighbors,
                                x: x, y: y,
                                n: tiles.length,
                            });
                        }
                    }
                    /*
                    const comparisons = [
                        {
                            method: "<",
                            get: v => v.x+2*v.y,
                        },
                        {
                            method: ">",
                            get: v => v.type,
                        },
                        {
                            method: ">",
                            get: v => v.n,
                        },
                    ];
                    */
                    const comparisons = [
                        { method: ">", get: (v, v2) => ((v.y > 0 && v2.y > 0) ? (v.neighbors+6*v.type) : 0) },
                        { method: "<", get: v => v.x+2*v.y },
                        { method: ">", get: v => v.type },
                        { method: ">", get: v => v.n },
                    ];
                    merges.sort((a, b) => {
                        for (let comparison of comparisons) {
                            let ar = comparison.get(a, b), br = comparison.get(b, a);
                            if (comparison.method == ">") {
                                if (ar > br) return -1;
                                if (ar < br) return +1;
                            } else {
                                if (ar < br) return -1;
                                if (ar > br) return +1;
                            }
                        }
                        return 0;
                    });
                    if (merges.length > 0) {
                        let first = merges.shift();
                        this.game.triggerTile(first.x, first.y);
                    }
                }
            }

            let t1 = util.getTime();
            if (SOCKET.disconnected) nentries = [];
            if (this.hasEBoardNoEntries())
                this.eBoardNoEntries.style.display = (Object.keys(entries).length <= 0 && SOCKET.connected) ? "" : "none";
            if (this.hasEBoardNoInternet())
                this.eBoardNoInternet.style.display = SOCKET.disconnected ? "" : "none";
            while (entries.length < nentries.length) {
                let div = document.createElement("div");
                if (this.hasEBoardEntries()) this.eBoardEntries.appendChild(div);
                div.innerHTML = "<div class='number'></div><div class='score'></div><div class='date'></div>";
                entries.push(div);
            }
            while (entries.length > nentries.length) {
                let div = entries.pop();
                if (this.hasEBoardEntries()) this.eBoardEntries.removeChild(div);
            }
            let div0 = null, place = null, ts = null;
            for (let i = 0; i < nentries.length; i++) {
                let div = entries[i], entry = nentries[i];
                div.style.order = i;
                if (div.querySelector(".number") instanceof HTMLDivElement)
                    div.querySelector(".number").textContent = i+1;
                if (div.querySelector(".score") instanceof HTMLDivElement)
                    div.querySelector(".score").textContent = entry.score;
                if (div.querySelector(".date") instanceof HTMLDivElement) {
                    let date = new Date(entry.ts);
                    div.querySelector(".date").textContent = [date.getMonth()+1, date.getFullYear()].join("-");
                }
                if (entry.id == ACCOUNTID) {
                    div0 = div;
                    place = i;
                    ts = entry.ts;
                    div.classList.add("this");
                    entry.score = this.maxScore;
                } else div.classList.remove("this");
            }
            [this.eBoardYouTop, this.eBoardYouBottom].forEach(div => {
                if (div.querySelector(".number"))
                    div.querySelector(".number").textContent = (place == null) ? "" : place+1;
                if (div.querySelector(".score"))
                    div.querySelector(".score").textContent = this.maxScore;
                if (div.querySelector(".date")) {
                    let date = new Date((ts == null) ? 0 : ts);
                    div.querySelector(".date").textContent = (ts == null) ? "" : [date.getMonth()+1, date.getFullYear()].join("-");
                }
            });
            if (div0 == null) {
                this.eBoardYouTop.style.display = "none";
                this.eBoardYouBottom.style.display = "";
                this.eBoardEntries.style.paddingTop = "";
                this.eBoardEntries.style.paddingBottom = "27.5px";
            } else {
                let rbound = this.eBoardNoEntries.parentElement.getBoundingClientRect();
                let r = div0.getBoundingClientRect();
                this.eBoardYouTop.style.display = (r.top < rbound.top) ? "" : "none";
                this.eBoardYouBottom.style.display = (r.bottom > rbound.bottom) ? "" : "none";
                this.eBoardEntries.style.paddingTop = "";
                this.eBoardEntries.style.paddingBottom = "";
            }
            if (t1-t0 < 10) return;
            t0 = t1;
            let wscore = (this.mode == "finish") ? this.game.score : 0;
            let wmoves = (this.mode == "finish") ? this.game.moves : 0;
            let pscore = score;
            score = Math.round(util.lerp(score, wscore, 0.1));
            if (score == pscore) score = wscore;
            if (this.hasEFinishScore()) this.eFinishScore.textContent = score;
            let pmoves = moves;
            moves = Math.round(util.lerp(moves, wmoves, 0.1));
            if (moves == pmoves) moves = wmoves;
            if (this.hasEFinishMoves()) this.eFinishMoves.textContent = moves+" moves";
        });
    }

    get history() { return [...this.#history]; }
    get mode() { return this.#mode; }
    set mode(v) {
        v = String(v);
        if (this.mode == v) return;
        this.#history.push(this.mode);
        while (this.#history > 100) this.#history.shift();
        this.post("change", "history");
        this.#mode = v;
        document.body.className = "";
        document.body.classList.add(this.mode);
        this.post("change", "mode");
    }
    back() {
        if (this.#history.length <= 0) return;
        let mode = this.#history.pop();
        this.post("change", "history");
        this.mode = mode;
    }

    get theme() { return this.#theme; }
    set theme(v) {
        v = String(v);
        if (this.theme == v) return;
        if (!(v in APPTHEME)) return;
        this.#theme = v;
        this.style();
        this.post("change", "theme");
    }

    get game() { return this.#game; }
    get maxScore() { return this.#maxScore; }
    set maxScore(v) {
        v = Math.max(0, util.ensure(v, "num"));
        if (this.maxScore == v) return;
        this.#maxScore = v;
        this.post("change", "maxScore");
    }
    get demoGame1() { return this.#demoGame1; }
    get demoGame2() { return this.#demoGame2; }

    start() {
        this.#eStyle = document.getElementById("style");
        this.style();

        this.#canvas = document.createElement("canvas");
        document.body.appendChild(this.canvas);
        this.#ctx = this.canvas.getContext("2d");
        let r = document.body.getBoundingClientRect();
        this.canvas.style.width = (r.width-100)+"px";
        this.canvas.style.height = (r.height-100)+"px";
        this.canvas.width = (r.width-100)*QUALITY;
        this.canvas.height = (r.height-100)*QUALITY;
        this.canvas.addEventListener("click", e => {
            let r = this.canvas.getBoundingClientRect();
            let p = new V(e.pageX-r.left, e.pageY-r.top).mul(QUALITY);
            this.game.trigger(p);
        });

        this.#eScore = document.getElementById("score");
        this.#eMoves = document.getElementById("moves");
        this.#eInfoTiles = document.getElementById("info-tiles");

        let t = 250;
        this.#eFastButton = document.getElementById("fast-button");
        if (this.hasEFastButton())
            this.eFastButton.addEventListener("click", async e => {
                if (this.mode != "game") return;
                let action = 0;
                if (this.game.TICKSPEED == 1) {
                    action = +1;
                    this.game.TICKSPEED = 3;
                } else {
                    action = -1;
                    this.game.TICKSPEED = 1;
                }
                this.game.ANIMSPEED = this.game.TICKSPEED;
                let t0 = util.getTime();
                let id = setInterval(() => {
                    let t1 = util.getTime();
                    if (t1-t0 > t) {
                        this.eFastButton.style.transform = "";
                        clearInterval(id);
                        return;
                    }
                    let p = (t1-t0)/t;
                    p = util.ease.quadO(p);
                    this.eFastButton.style.transform = "translateX("+util.lerp(5*action, 0, p)+"px)";
                });
            });
        this.#eQuitButton = document.getElementById("quit-button");
        if (this.hasEQuitButton())
            this.eQuitButton.addEventListener("click", async e => {
                if (this.mode != "game") return;
                let d = this.eQuitButton.disabled;
                this.eQuitButton.disabled = true;
                let t0 = util.getTime();
                let id = setInterval(() => {
                    let t1 = util.getTime();
                    if (t1-t0 > t) {
                        this.eQuitButton.style.transform = "";
                        clearInterval(id);
                        return;
                    }
                    let p = (t1-t0)/t;
                    p = util.ease.quadIO(p);
                    this.eQuitButton.style.transform = "translateY("+util.lerp(5, 0, p)+"px)";
                });
                await this.game.fancyReload(false);
                this.mode = "finish";
                let newBest = false;
                if (this.game.score > this.maxScore) {
                    newBest = true;
                    this.maxScore = this.game.score;
                }
                if (this.hasEFinish()) {
                    if (newBest) this.eFinish.classList.add("best");
                    else this.eFinish.classList.remove("best");
                }
                this.eQuitButton.disabled = d;
            });
        
        this.#eGameBoardButton = document.getElementById("game-board-button");
        if (this.hasEGameBoardButton())
            this.eGameBoardButton.addEventListener("click", e => {
                if (this.mode != "game") return;
                this.mode = "board";
            });
        this.#eGameHelpButton = document.getElementById("game-help-button");
        if (this.hasEGameHelpButton())
            this.eGameHelpButton.addEventListener("click", e => {
                if (this.mode != "game") return;
                this.mode = "help";
            });
        this.#eGameThemeButton = document.getElementById("game-theme-button");
        if (this.hasEGameThemeButton())
            this.eGameThemeButton.addEventListener("click", e => {
                if (this.theme == "LIGHT") this.theme = "DARK";
                else this.theme = "LIGHT";
            });
        
        this.#ePlayButton = document.getElementById("play-button");
        if (this.hasEPlayButton())
            this.ePlayButton.addEventListener("click", e => {
                if (this.mode != "title") return;
                this.mode = "game";
                this.game.reload();
            });
        this.#eBoardButton = document.getElementById("board-button");
        if (this.hasEBoardButton())
            this.eBoardButton.addEventListener("click", e => {
                if (this.mode != "title") return;
                this.mode = "board";
            });
        this.#eHelpButton = document.getElementById("help-button");
        if (this.hasEHelpButton())
            this.eHelpButton.addEventListener("click", e => {
                if (this.mode != "title") return;
                this.mode = "help";
            });
        this.#eThemeButton = document.getElementById("theme-button");
        if (this.hasEThemeButton())
            this.eThemeButton.addEventListener("click", e => {
                if (this.theme == "LIGHT") this.theme = "DARK";
                else this.theme = "LIGHT";
            });
        
        this.#eFinish = document.getElementById("finish");
        if (this.hasEFinish()) {
            this.eFinish.addEventListener("click", e => {
                if (this.mode != "finish") return;
                this.mode = "title";
            });
            Array.from(this.eFinish.querySelectorAll(".block")).forEach(elem => elem.addEventListener("click", e => e.stopPropagation()));
        }
        this.#eFinishIcon = document.getElementById("finish-icon");
        this.#eFinishScore = document.getElementById("finish-score");
        this.#eFinishMoves = document.getElementById("finish-moves");
        this.#eNewBest = document.getElementById("new-best");

        this.#eBoardBackButton = document.getElementById("board-back-button");
        if (this.hasEBoardBackButton())
            this.eBoardBackButton.addEventListener("click", e => {
                if (this.mode != "board") return;
                this.back();
            });
        this.#eBoardEntries = document.getElementById("board-entries");
        this.#eBoardNoEntries = document.getElementById("board-no-entries");
        this.#eBoardNoInternet = document.getElementById("board-no-internet");
        this.#eBoardYouTop = document.createElement("div");
        if (this.hasEBoardEntries()) this.eBoardEntries.parentElement.appendChild(this.eBoardYouTop);
        this.eBoardYouTop.id = "you-top";
        this.eBoardYouTop.classList.add("you");
        this.eBoardYouTop.innerHTML = "<div class='number'></div><div class='score'></div><div class='date'></div>";
        this.#eBoardYouBottom = document.createElement("div");
        if (this.hasEBoardEntries()) this.eBoardEntries.parentElement.appendChild(this.eBoardYouBottom);
        this.eBoardYouBottom.id = "you-bottom";
        this.eBoardYouBottom.classList.add("you");
        this.eBoardYouBottom.innerHTML = "<div class='number'></div><div class='score'></div><div class='date'></div>";

        this.demoGame1.size = [2, 3];
        this.demoGame1.ceil = true;
        let demox = 0, demoy = 0;
        this.demoGame1.addHandler("tick", (function() {
            if (this.floor) {
                for (let x = 0; x < this.w; x++) {
                    if (this.hasTile(x, this.h-1)) continue;
                    let tile = this.addTile(new App.Game.Tile(this, [x, this.h-1], 1));
                    tile.rY++;
                }
                if (this.canTrigger) {
                    if (++demox > 5) {
                        demox = 0;
                        if (demoy == 0) this.triggerTile(0, 0);
                        else if (demoy == 1) this.triggerTile(1, 0);
                        else if (demoy == 2) this.triggerTile(0, 0);
                        else if (demoy == 3) this.triggerTile(1, 0);
                        else if (demoy == 4) this.triggerTile(1, 1);
                        else if (demoy == 5) this.triggerTile(1, 0);
                        else if (demoy == 6) this.triggerTile(0, 0);
                        else {
                            demoy = -1;
                            this.floor = false;
                        }
                        demoy++;
                    }
                }
            } else if (this.tiles.length <= 0) this.floor = true;
        }).bind(this.demoGame1));
        const demo1 = document.getElementById("demo1");
        if (demo1 instanceof HTMLCanvasElement) {
            let size = this.demoGame1.size.mul(30);
            demo1.style.width = size.x+"px";
            demo1.style.height = size.y+"px";
            demo1.width = size.x*QUALITY;
            demo1.height = size.y*QUALITY;
            let ctx = demo1.getContext("2d");
            this.demoGame1.elems = { canvas: demo1, ctx: ctx };
        }
        this.demoGame2.size = [5, 1];
        this.demoGame2.ceil = true;
        this.demoGame2.addHandler("tick", (function () {
            for (let x = 0; x < this.w; x++) {
                if (this.hasTile(x, this.h-1)) continue;
                let tile = this.addTile(new App.Game.Tile(this, [x, this.h-1], x+1));
                tile.rY++;
            }
        }).bind(this.demoGame2));
        const demo2 = document.getElementById("demo2");
        if (demo2 instanceof HTMLCanvasElement) {
            let size = this.demoGame2.size.mul(30);
            demo2.style.width = size.x+"px";
            demo2.style.height = size.y+"px";
            demo2.width = size.x*QUALITY;
            demo2.height = size.y*QUALITY;
            let ctx = demo2.getContext("2d");
            this.demoGame2.elems = { canvas: demo2, ctx: ctx };
        }
        this.#eHelpBackButton = document.getElementById("help-back-button");
        if (this.hasEHelpBackButton())
            this.eHelpBackButton.addEventListener("click", e => {
                if (this.mode != "help") return;
                this.back();
            });
        
        this.fullLoad();
        let t0 = 0;
        const update = () => {
            window.requestAnimationFrame(update);
            let t1 = util.getTime();
            // if (t1-t0 < 1000/30) return;
            this.update(t1-t0);
            this.render();
            t0 = t1;
        };
        update();
    }
    load(app) {
        app = util.ensure(app, "obj");
        this.theme = ("theme" in app) ? app.theme : "LIGHT";
        this.mode = ("mode" in app) ? app.mode : "title";
        this.#history = util.ensure(app.history, "arr");
        while (this.#history.length > 100) this.#history.shift();
        this.post("change", "history");
        this.game.load(app.game);
        this.maxScore = ("maxScore" in app) ? app.maxScore : 0;
    }
    save() {
        let app = {};
        app.theme = this.theme;
        app.mode = this.mode;
        app.history = this.history;
        app.game = this.game.save();
        app.maxScore = this.maxScore;
        return app;
    }
    fullLoad() {
        let app = localStorage.getItem("app");
        try {
            app = JSON.parse(app);
        } catch (e) { app = null; }
        this.load(app);
    }
    fullSave() {
        let app = this.save();
        localStorage.setItem("app", JSON.stringify(app));
    }

    async emitScores() {
        console.log("sio: ask scores");
        let scores = await new Promise((res, rej) => SOCKET.emit("scores", res));
        console.log("sio: rec scores");
        scores = util.ensure(scores, "arr");
        scores = scores.map(entry => {
            entry = util.ensure(entry, "obj");
            return {
                id: String(entry.id), ts: util.ensure(entry.ts, "num"),
                score: Math.max(0, Math.round(util.ensure(entry.score, "num"))),
            };
        });
        scores.sort((a, b) => {
            if (a.score > b.score) return -1;
            if (a.score < b.score) return +1;
            if (a.ts < b.ts) return -1;
            if (a.ts > b.ts) return +1;
            return 0;
        });
        return scores;
    }
    async emitScore() {
        console.log("sio: ask score ("+ACCOUNTID+" = "+this.maxScore+")");
        if (ACCOUNTID == null) return;
        let r = await new Promise((res, rej) => SOCKET.emit("score", ACCOUNTID, this.maxScore, res));
        console.log("sio: rec score: "+r);
        return r;
    }

    get canvas() { return this.#canvas; }
    get ctx() { return this.#ctx; }

    update(delta) {
        this.game.update(delta);
        if (this.hasEFastButton()) {
            if (this.eFastButton.children[0] instanceof HTMLElement)
                this.eFastButton.children[0].setAttribute("name", "play-forward"+(this.game.TICKSPEED != 1 ? "" : "-outline"));
        }
        if (this.hasEGameThemeButton()) {
            if (this.eGameThemeButton.children[0] instanceof HTMLElement)
                this.eGameThemeButton.children[0].setAttribute("name", "moon"+(this.theme == "LIGHT" ? "-outline" : ""));
        }
        if (this.hasEThemeButton()) {
            if (this.eThemeButton.children[0] instanceof HTMLElement)
                this.eThemeButton.children[0].setAttribute("name", "moon"+(this.theme == "LIGHT" ? "-outline" : ""));
        }
        this.demoGame1.update(delta);
        this.demoGame2.update(delta);
        this.post("update");
    }
    render() {
        // THEME[15].hsv = [360*(util.getTime()/5000), 0.8, 0.8];
        this.game.render();
        this.demoGame1.render();
        this.demoGame2.render();
        this.post("render");
    }

    style() {
        let vars = {};
        for (let i = 0; i < 16; i++) {
            let bg = new util.Color(APPTHEME[this.theme].BG);
            let fg = new util.Color(APPTHEME[this.theme].FG);
            let a = new util.Color(APPTHEME[this.theme].ACCENT);
            bg.a = fg.a = a.a = i/15;
            let hex = "0123456789abcdef"[i];
            vars["bg-"+hex] = bg;
            vars["fg-"+hex] = fg;
            vars["a-"+hex] = a;
            if (i < 15) continue;
            vars["bg"] = vars["bg-f"];
            vars["fg"] = vars["fg-f"];
            vars["a"] = vars["a-f"];
        }
        for (let type in THEME) {
            for (let i = 0; i < 16; i++) {
                let c = new util.Color(THEME[type]);
                if (this.theme == "DARK") c = util.lerp(c, APPTHEME[this.theme].BG, APPTHEMELERP);
                let c2 = new util.Color((type in THEME2) ? THEME2[type] : THEME2DEFAULT);
                c.a = c2.a = i/15;
                let hex = "0123456789abcdef"[i];
                vars["t-"+type+"-"+hex] = c;
                vars["t2-"+type+"-"+hex] = c2;
                if (i < 15) continue;
                vars["t-"+type] = vars["t-"+type+"-f"];
                vars["t2-"+type] = vars["t2-"+type+"-f"];
            }
            let canvas, ctx;
            canvas = document.createElement("canvas");
            ctx = canvas.getContext("2d");
            canvas.width = canvas.height = 100;
            App.Game.Tile.render(type, {}, ctx);
            vars["i-"+type] = "url('"+canvas.toDataURL()+"')";
            for (let atype in APPTHEME[this.theme]) {
                for (let i = 0; i < 16; i++) {
                    canvas = document.createElement("canvas");
                    ctx = canvas.getContext("2d");
                    canvas.width = canvas.height = 100;
                    ctx.fillStyle = APPTHEME[this.theme][atype].toRGBA();
                    ctx.globalAlpha = i/15;
                    let hex = "0123456789abcdef"[i];
                    App.Game.Tile.renderShape(type, { size: 150 }, ctx);
                    vars["i-i-"+atype.toLowerCase()+"-"+hex+"-"+type] = "url('"+canvas.toDataURL()+"')";
                    if (i < 15) continue;
                    vars["i-i-"+atype.toLowerCase()+"-"+type] = vars["i-i-"+atype.toLowerCase()+"-f-"+type];
                }
            }
        }
        let styleStr = "";
        styleStr += ":root{";
        for (let k in vars) {
            let v = vars[k];
            if (v instanceof util.Color) v = v.toRGBA();
            styleStr += "--"+k+":"+v+";";
        }
        styleStr += "}";
        if (this.hasEStyle()) this.eStyle.innerHTML = styleStr;
    }

    get eStyle() { return this.#eStyle; }
    hasEStyle() { return this.eStyle instanceof HTMLStyleElement; }

    get eScore() { return this.#eScore; }
    hasEScore() { return this.eScore instanceof HTMLDivElement; }
    get eMoves() { return this.#eMoves; }
    hasEMoves() { return this.eMoves instanceof HTMLDivElement; }

    get eInfoTiles() { return this.#eInfoTiles; }
    hasEInfoTiles() { return this.eInfoTiles instanceof HTMLDivElement; }

    get eFastButton() { return this.#eFastButton; }
    hasEFastButton() { return this.eFastButton instanceof HTMLButtonElement; }
    get eQuitButton() { return this.#eQuitButton; }
    hasEQuitButton() { return this.eQuitButton instanceof HTMLButtonElement; }

    get eGameBoardButton() { return this.#eGameBoardButton; }
    hasEGameBoardButton() { return this.eGameBoardButton instanceof HTMLButtonElement; }
    get eGameHelpButton() { return this.#eGameHelpButton; }
    hasEGameHelpButton() { return this.eGameHelpButton instanceof HTMLButtonElement; }
    get eGameThemeButton() { return this.#eGameThemeButton; }
    hasEGameThemeButton() { return this.eGameThemeButton instanceof HTMLButtonElement; }

    get ePlayButton() { return this.#ePlayButton; }
    hasEPlayButton() { return this.ePlayButton instanceof HTMLButtonElement; }
    get eBoardButton() { return this.#eBoardButton; }
    hasEBoardButton() { return this.eBoardButton instanceof HTMLButtonElement; }
    get eHelpButton() { return this.#eHelpButton; }
    hasEHelpButton() { return this.eHelpButton instanceof HTMLButtonElement; }
    get eThemeButton() { return this.#eThemeButton; }
    hasEThemeButton() { return this.eThemeButton instanceof HTMLButtonElement; }

    get eFinish() { return this.#eFinish; }
    hasEFinish() { return this.eFinish instanceof HTMLDivElement; }
    get eFinishIcon() { return this.#eFinishIcon; }
    hasEFinishIcon() { return this.eFinishIcon instanceof HTMLDivElement; }
    get eFinishScore() { return this.#eFinishScore; }
    hasEFinishScore() { return this.eFinishScore instanceof HTMLDivElement; }
    get eFinishMoves() { return this.#eFinishMoves; }
    hasEFinishMoves() { return this.eFinishMoves instanceof HTMLDivElement; }
    get eNewBest() { return this.#eNewBest; }
    hasENewBest() { return this.eNewBest instanceof HTMLDivElement; }

    get eBoardBackButton() { return this.#eBoardBackButton; }
    hasEBoardBackButton() { return this.eBoardBackButton instanceof HTMLButtonElement; }
    get eBoardEntries() { return this.#eBoardEntries; }
    hasEBoardEntries() { return this.eBoardEntries instanceof HTMLDivElement; }
    get eBoardNoEntries() { return this.#eBoardNoEntries; }
    hasEBoardNoEntries() { return this.eBoardNoEntries instanceof HTMLDivElement; }
    get eBoardNoInternet() { return this.#eBoardNoInternet; }
    hasEBoardNoInternet() { return this.eBoardNoInternet instanceof HTMLDivElement; }
    get eBoardYouTop() { return this.#eBoardYouTop; }
    get eBoardYouBottom() { return this.#eBoardYouBottom; }

    get eHelpBackButton() { return this.#eHelpBackButton; }
    hasEHelpBackButton() { return this.eHelpBackButton instanceof HTMLButtonElement; }
}
App.Game = class AppGame extends util.Target {
    #app;
    #elems;

    #TICKSPEED;
    #ANIMSPEED;
    
    #size;

    #score;
    #moves;
    #tiles;
    #floor;
    #ceil;

    #tickTimer;
    #paused;

    #canTrigger;
    #canMerge;

    constructor(app, elems) {
        super();

        if (!(app instanceof App)) throw "App parameter is not of class App";
        this.#app = app;
        this.#elems = {};

        this.#TICKSPEED = 1;
        this.#ANIMSPEED = 1;

        this.#size = new V();
        this.size.addHandler("change", c => {
            let blocked = false;
            if (this.w < 0 || this.w%1 > 0) {
                blocked = true;
                this.w = Math.max(0, Math.ceil(this.w));
            }
            if (this.h < 0 || this.h%1 > 0) {
                blocked = true;
                this.h = Math.max(0, Math.ceil(this.h));
            }
            if (blocked) return;
            this.tiles = [];
            this.post("change", "size."+c);
        });

        this.#score = 0;
        this.#moves = 0;
        this.#tiles = new Set();
        this.#floor = true;
        this.#ceil = false;

        this.#tickTimer = 0;
        this.#paused = false;

        this.#canTrigger = false;
        this.#canMerge = false;
        
        this.elems = elems;

        this.start();

        let t0 = 0, score = 0, moves = 0;
        let tiles = [];
        this.addHandler("update", () => {
            let t1 = util.getTime();
            if (t1-t0 < 10) return;
            t0 = t1;
            let pscore = score;
            score = Math.round(util.lerp(score, this.score, 0.1));
            if (score == pscore) score = this.score;
            if (this.hasEScore()) this.eScore.textContent = score;
            let pmoves = moves;
            moves = Math.round(util.lerp(moves, this.moves, 0.1));
            if (moves == pmoves) moves = this.moves;
            if (this.hasEMoves()) this.eMoves.textContent = moves;
            if (this.hasEInfoTiles()) {
                let n = this.maxTile;
                let t = 250, t0 = util.getTime();
                while (tiles.length < n) {
                    let tile = document.createElement("div");
                    tiles.push(tile);
                    let first = true;
                    let id = setInterval(() => {
                        let t1 = util.getTime();
                        if (t1-t0 > t) {
                            tile.style.minWidth = "";
                            tile.style.width = "";
                            clearInterval(id);
                            return;
                        }
                        let p = (t1-t0)/t;
                        p = util.ease.quadO(p);
                        tile.style.minWidth = util.lerp(0, 20, p)+"px";
                        tile.style.width = util.lerp(0, 20, p)+"px";
                        if (!first) return;
                        first = false;
                        if (!this.hasEInfoTiles()) return;
                        this.eInfoTiles.appendChild(tile);
                    });
                }
                while (tiles.length > n) {
                    let tile = tiles.pop();
                    let id = setInterval(() => {
                        let t1 = util.getTime();
                        if (t1-t0 > t) {
                            tile.style.minWidth = "";
                            tile.style.width = "";
                            this.eInfoTiles.removeChild(tile);
                            clearInterval(id);
                            return;
                        }
                        let p = (t1-t0)/t;
                        p = 1-util.ease.quadI(p);
                        tile.style.minWidth = util.lerp(0, 20, p)+"px";
                        tile.style.width = util.lerp(0, 20, p)+"px";
                    });
                }
                tiles.forEach((tile, i) => {
                    tile.style.backgroundImage = "var(--i-i-fg-"+(i+1)+")";
                });
            }
        });
    }
    
    get app() { return this.#app; }
    get elems() { return this.#elems; }
    set elems(v) { this.#elems = util.ensure(v, "obj"); }
    get canvas() { return this.#elems.canvas; }
    hasCanvas() { return this.canvas instanceof HTMLCanvasElement; }
    get ctx() { return this.#elems.ctx; }
    hasCTX() { return this.ctx instanceof CanvasRenderingContext2D; }
    get eScore() { return this.#elems.eScore; }
    hasEScore() { return this.eScore instanceof HTMLDivElement; }
    get eMoves() { return this.#elems.eMoves; }
    hasEMoves() { return this.eMoves instanceof HTMLDivElement; }
    get eInfoTiles() { return this.#elems.eInfoTiles; }
    hasEInfoTiles() { return this.eInfoTiles instanceof HTMLDivElement; }

    get TICKSPEED() { return this.#TICKSPEED; }
    set TICKSPEED(v) {
        v = Math.max(util.EPSILON, util.ensure(v, "num"));
        if (this.TICKSPEED == v) return;
        this.#TICKSPEED = v;
        this.post("change", "TICKSPEED");
    }
    get ANIMSPEED() { return this.#ANIMSPEED; }
    set ANIMSPEED(v) {
        v = Math.max(util.EPSILON, util.ensure(v, "num"));
        if (this.ANIMSPEED == v) return;
        this.#ANIMSPEED = v;
        this.post("change", "ANIMSPEED");
    }

    start() {
        this.reload();
    }
    load(game) {
        game = util.ensure(game, "obj");
        if ("size" in game) this.size = game.size;
        if ("score" in game) this.score = game.score;
        if ("moves" in game) this.moves = game.moves;
        util.ensure(game.tiles, "arr").map(tile => {
            tile = util.ensure(tile, "obj");
            this.addTile(new App.Game.Tile(this, tile.pos, tile.type));
        });
    }
    save() {
        let game = {};
        game.size = this.size.xy;
        game.score = this.score;
        game.moves = this.moves;
        game.tiles = this.tiles.map(tile => { return { pos: tile.pos.xy, type: tile.type }; });
        return game;
    }
    reload() {
        this.size = 0;
        this.size = 5;
        this.score = 0;
        this.moves = 0;
        this.floor = true;
        this.ceil = false;
    }
    async fancyReload(full=true) {
        await new Promise((res, rej) => {
            this.floor = false;
            this.ceil = true;
            this.tiles.forEach(tile => (tile.suspend = ((Math.random() > 0.3) ? 0 : 1)));
            let id = setInterval(() => {
                if (this.tiles.length > 0) return;
                clearInterval(id);
                if (full) this.reload();
                res();
            });
        });
    }

    get size() { return this.#size; }
    set size(v) { this.#size.set(v); }
    get w() { return this.size.x; }
    set w(v) { this.size.x = v; }
    get h() { return this.size.y; }
    set h(v) { this.size.y = v; }

    get score() { return this.#score; }
    set score(v) {
        v = Math.max(0, util.ensure(v, "int"));
        if (this.score == v) return;
        this.#score = v;
        this.post("change", "score");
    }
    get moves() { return this.#moves; }
    set moves(v) {
        v = Math.max(0, util.ensure(v, "int"));
        if (this.moves == v) return;
        this.#moves = v;
        this.post("change", "moves");
    }
    get maxTile() {
        let maxTile = 0;
        this.tiles.forEach(tile => {
            if (!tile.isBasic()) return;
            maxTile = Math.max(maxTile, tile.basicType);
        });
        return maxTile;
    }
    get tiles() {
        let tiles = [...this.#tiles];
        return tiles.sort((a, b) => {
            if (a.y < b.y) return -1;
            if (a.y > b.y) return +1;
            if (a.x < b.x) return -1;
            if (a.x > b.x) return +1;
            return 0;
        });
    }
    set tiles(v) {
        v = util.ensure(v, "arr");
        this.clearTiles();
        v.forEach(v => this.addTile(v));
    }
    clearTiles() {
        let tiles = this.tiles;
        tiles.forEach(tile => this.remTile(tile));
        return tiles;
    }
    getTile(...v) {
        v = new V(...v).round();
        for (let tile of this.#tiles) {
            if (tile.isRender) continue;
            if (tile.pos.equals(v))
                return tile;
        }
        return null;
    }
    hasTile(...v) {
        if ((v.length == 1) && (v[0] instanceof App.Game.Tile)) return this.#tiles.has(v[0]);
        return this.getTile(...v) instanceof App.Game.Tile;
    }
    addTile(tile) {
        if (!(tile instanceof App.Game.Tile)) return false;
        if (tile.game != this) return false;
        if (this.hasTile(tile)) return false;
        this.#tiles.add(tile);
        tile._onChange = c => this.post("change", "tiles."+c);
        tile.addHandler("change", tile._onChange);
        this.post("change", "addTile()");
        return tile;
    }
    remTile(tile) {
        if (!(tile instanceof App.Game.Tile)) return false;
        if (tile.game != this) return false;
        if (!this.hasTile(tile)) return false;
        this.#tiles.delete(tile);
        tile.remHandler("change", tile._onChange);
        delete tile._onChange;
        this.post("change", "remTile()");
        return tile;
    }
    get floor() { return this.#floor; }
    set floor(v) {
        v = !!v;
        if (this.floor == v) return;
        this.#floor = v;
        this.post("change", "floor");
    }
    get ceil() { return this.#ceil; }
    set ceil(v) {
        v = !!v;
        if (this.ceil == v) return;
        this.#ceil = v;
        this.post("change", "ceil");
    }

    get paused() { return this.#paused; }
    set paused(v) { this.#paused = !!v; }

    get canTrigger() { return this.#canTrigger; }
    trigger(p) {
        if (this.paused) return;
        if (!this.canTrigger) return;
        p = new V(p);
        let tiles = this.tiles;
        for (let tile of tiles) {
            if (!tile.rect.collides(p)) continue;
            this.triggerTile(tile.pos);
            break;
        }
        this.post("trigger");
    }
    triggerTile(...p) {
        p = new V(...p).round();
        if (!this.hasTile(p)) return;
        this.getTile(p).trigger();
        this.moves++;
        this.post("triggerTile");
    }
    get canMerge() { return this.#canMerge; }

    tick() {
        if (this.paused) return;
        if (!this.ceil)
            for (let x = 0; x < this.w; x++) {
                if (this.hasTile(x, this.h-1)) continue;
                let type;
                for (type = 1; type < Math.max(2, this.maxTile); type++)
                    if (Math.random() > 0.3)
                        break;
                // type = this.tiles.length%15 + 1;
                let tile = this.addTile(new App.Game.Tile(this, [x, this.h-1], type));
                tile.rY++;
            }
        this.tiles.forEach(tile => tile.tick());
        let isFull = true;
        let grid = new Array(this.w).fill(null).map(_ => new Array(this.h).fill(null));
        for (let x = 0; x < this.w; x++) {
            for (let y = 0; y < this.h; y++) {
                if (!this.hasTile(x, y)) {
                    isFull = false;
                    break;
                }
                grid[x][y] = this.getTile(x, y).basicType;
            }
        }
        this.#canMerge = false;
        for (let x = 0; x < this.w; x++) {
            for (let y = 0; y < this.h; y++) {
                let p = new V(x, y), t = grid[p.x][p.y];
                for (let shift of [
                    [+1, 0],
                    [-1, 0],
                    [0, +1],
                    [0, -1],
                ]) {
                    let p2 = p.add(shift);
                    if (p2.x < 0 || p2.x >= this.w) continue;
                    if (p2.y < 0 || p2.y >= this.h) continue;
                    let t2 = grid[p2.x][p2.y];
                    if (t != t2) continue;
                    this.#canMerge = true;
                    break;
                }
                if (this.canMerge) break;
            }
            if (this.canMerge) break;
        }
        this.tiles.forEach(tile => {
            if (
                tile.x >= -2 && tile.x <= this.w+1 &&
                tile.y >= -2 && tile.y <= this.h+1
            ) return;
            this.remTile(tile);
        });
        this.#canTrigger = this.floor && isFull;
        this.post("tick");
    }
    update(delta) {
        this.tiles.forEach(tile => tile.update(delta));
        let t = util.getTime();
        if (t-this.#tickTimer > 150/this.TICKSPEED) {
            this.#tickTimer = t;
            this.tick();
        }
        this.post("update");
    }
    render() {
        if (!this.hasCanvas() || !this.hasCTX()) return;
        const canvas = this.canvas, ctx = this.ctx;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.tiles.sort((a, b) => a.rZ-b.rZ).forEach(tile => tile.render());
        this.post("render");
    }
};
App.Game.Tile = class AppGameTile extends util.Target {
    #game;

    #pos;
    #type;
    #suspend;

    #isRender;
    #rZ;
    #rPos;
    #rScale;
    #rDir;
    #rBright;

    #rect;

    constructor(game, pos, type) {
        super();

        if (!(game instanceof App.Game)) throw "Game parameter is not of class Game";
        this.#game = game;

        this.#pos = new V();
        this.pos.addHandler("change", c => {
            let blocked = false;
            if (this.x%1 != 0) {
                blocked = true;
                this.x = Math.round(this.x);
            }
            if (this.y%1 != 0) {
                blocked = true;
                this.x = Math.round(this.y);
            }
            if (blocked) return;
            this.post("change", "pos."+c);
        });
        this.#type = null;
        this.#suspend = 0;

        this.#isRender = false;
        this.#rZ = 0;
        this.#rPos = new V();
        this.#rScale = new V(1);
        this.#rDir = 0;
        this.#rBright = 0;
        this.rPos.addHandler("change", c => this.post("change", "rPos."+c));
        this.rScale.addHandler("change", c => this.post("change", "rScale."+c));

        this.#rect = new util.Rect();

        this.pos = pos;
        this.type = type;

        this.rPos = pos;
    }

    get game() { return this.#game; }
    get canvas() { return this.game.canvas; }
    hasCanvas() { return this.game.hasCanvas(); }
    get ctx() { return this.game.ctx; }
    hasCTX() { return this.game.hasCTX(); }

    get pos() { return this.#pos; }
    set pos(v) { this.#pos.set(v); }
    get x() { return this.pos.x; }
    set x(v) { this.pos.x = v; }
    get y() { return this.pos.y; }
    set y(v) { this.pos.y = v; }
    isOut() {
        if (this.x < 0 || this.x >= this.game.w) return true;
        if (this.y < 0 || this.y >= this.game.h) return true;
        return false;
    }
    get type() { return this.#type; }
    set type(v) {
        v = String(v);
        if (this.type == v) return;
        this.#type = v;
        this.post("change", "type");
    }
    isBasic() { return util.is(parseInt(this.type), "int"); }
    get basicType() { return this.isBasic() ? parseInt(this.type) : null; }
    get score() {
        if (!this.isBasic()) return null;
        return 3 ** (this.basicType-1);
    }
    get suspend() { return this.#suspend; }
    set suspend(v) {
        v = Math.max(0, util.ensure(v, "int"));
        if (this.suspend == v) return;
        this.#suspend = v;
        this.post("change", "suspend");
    }

    get isRender() { return this.#isRender; }
    set isRender(v) {
        v = !!v;
        if (this.isRender == v) return;
        this.#isRender = v;
        this.post("change", "isRender");
    }
    get rZ() { return this.#rZ; }
    set rZ(v) {
        v = util.ensure(v, "num");
        if (this.rZ == v) return;
        this.#rZ = v;
        this.post("change", "rZ");
    }
    get rPos() { return this.#rPos; }
    set rPos(v) { this.#rPos.set(v); }
    get rX() { return this.rPos.x; }
    set rX(v) { this.rPos.x = v; }
    get rY() { return this.rPos.y; }
    set rY(v) { this.rPos.y = v; }
    get rScale() { return this.#rScale; }
    set rScale(v) { this.#rScale.set(v); }
    get rScaleX() { return this.rScale.x; }
    set rScaleX(v) { this.rScale.x = v; }
    get rScaleY() { return this.rScale.y; }
    set rScaleY(v) { this.rScale.y = v; }
    get rDir() { return this.#rDir; }
    set rDir(v) {
        v = ((v%360)+360)%360;
        if (this.rDir == v) return;
        this.#rDir = v;
        this.post("change", "rDir");
    }
    get rBright() { return this.#rBright; }
    set rBright(v) {
        v = Math.min(+1, Math.max(-1, util.ensure(v, "num")));
        if (this.rBright == v) return;
        this.#rBright = v;
        this.post("change", "rBright");
    }

    get rect() { return this.#rect; }

    trigger() {
        if (this.isRender) return;
        if (this.isOut()) return;
        if (!this.isBasic()) return;
        let type = this.basicType;
        let reach = new Array(this.game.w).fill(null).map(_ => new Array(this.game.h).fill(false));
        let tiles = [], paths = [[this.pos]];
        while (paths.length > 0) {
            let path = paths.shift();
            let pos = path.at(-1);
            if (pos.x < 0 || pos.x >= this.game.w) continue;
            if (pos.y < 0 || pos.y >= this.game.h) continue;
            if (reach[pos.x][pos.y]) continue;
            reach[pos.x][pos.y] = true;
            if (!this.game.hasTile(pos)) continue;
            let tile = this.game.getTile(pos);
            if (!tile.isBasic()) continue;
            if (tile.basicType != type) continue;
            tiles.push({
                tile: tile,
                path: [...path],
            });
            [
                [+1, 0],
                [-1, 0],
                [0, +1],
                [0, -1],
            ].forEach(shift => paths.push([...path, pos.add(shift)]));
        }
        tiles.shift();
        if (tiles.length <= 0) return;
        let t = 250, t0 = util.getTime();
        tiles.forEach(data => {
            let tile = data.tile, path = data.path;
            path.reverse();
            tile.isRender = true;
            let ti = t * util.lerp(0.25, 1, Math.random());
            let t0i = t0 + util.lerp(0, t-ti, Math.random());
            let id = setInterval(() => {
                let t1 = util.getTime();
                if ((t1-t0i)*this.game.ANIMSPEED > ti) {
                    clearInterval(id);
                    this.game.remTile(tile);
                    return;
                }
                let p = ((t1-t0i)*this.game.ANIMSPEED)/ti;
                p = Math.min(1, Math.max(0, p));
                p = util.ease.quadI(p);
                tile.rZ = -1;
                let i = Math.floor(p*(path.length-1));
                let j = Math.min(path.length-1, i+1);
                tile.rPos = (i == j) ? path[i] : util.lerp(path[i], path[j], (p-(i*(1/(path.length-1))))/(1/(path.length-1)));
                tile.rScale = util.lerp(1, 0.5, p);
            });
        });
        let id = setInterval(() => {
            let t1 = util.getTime();
            if (t1-t0 > t) {
                this.rDir = 0;
                this.game.paused = false;
                if (type+1 in THEME) this.type = type+1;
                clearInterval(id);
                t = 250, t0 = util.getTime();
                id = setInterval(() => {
                    let t1 = util.getTime();
                    if ((t1-t0)*this.game.ANIMSPEED > t) {
                        clearInterval(id);
                        this.rScale = 1;
                        this.rBright = 0;
                        return;
                    }
                    let p = ((t1-t0)*this.game.ANIMSPEED)/t;
                    p = Math.min(1, Math.max(0, p));
                    p = util.ease.quadO(p);
                    this.rScale = util.lerp(1.25, 1, p);
                    this.rBright = util.lerp(1, 0, p);
                });
                return;
            }
            let p = (t1-t0)/t;
            p = Math.min(1, Math.max(0, p));
            p = util.ease.quadI(p);
            this.rScale = util.lerp(1, 0.7, p);
            this.rBright = util.lerp(0, 0.25, p);
            this.rDir = util.lerp(-5, +5, Math.random());
        });
        this.game.score += (tiles.length+1)*this.score;
        this.game.paused = true;
        this.post("trigger");
    }

    tick() {
        if (this.isOut()) this.y--;
        else if (this.y > 0 || !this.game.floor) {
            if (!this.game.hasTile(this.x, this.y-1)) {
                if (this.suspend > 0) this.suspend--;
                else this.y--;
            }
        }
        this.post("tick");
    }
    update(delta) {
        if (!this.isRender) {
            let p = Math.min(1, Math.max(0, 0.05 ** ((7.5/this.game.ANIMSPEED)/delta)));
            this.rX = util.lerp(this.rX, this.x, p);
            this.rY = util.lerp(this.rY, this.y, p);
        }
        this.post("update");
    }
    static render(type, render, ctx) {
        type = String(type);
        render = util.ensure(render, "obj");
        if (!(ctx instanceof CanvasRenderingContext2D)) throw "Cannot render without CanvasRenderingContext2D";
        let pos = new V(("pos" in render) ? render.pos : [ctx.canvas.width/2, ctx.canvas.height/2]);
        let size = new V(("size" in render) ? render.size : Math.min(ctx.canvas.width, ctx.canvas.height));
        let scale = new V(("scale" in render) ? render.scale : 1);
        let dir = util.ensure(render.dir, "num", 0);
        let bright = util.ensure(render.bright, "num", 0);
        let alpha = util.ensure(render.alpha, "num", 1);
        let theme = String(render.theme);
        size.imul(scale);
        let rect = new util.Rect(
            pos.sub(size.div(2)),
            size,
        );
        ctx.globalAlpha = alpha;
        let c = THEME[type];
        if (theme == "DARK") c = util.lerp(c, APPTHEME[theme].BG, APPTHEMELERP);
        ctx.fillStyle = brighten(c, bright).toRGBA();
        let polygon = [
            rect.tr,
            rect.tl,
            rect.bl,
            rect.br,
        ];
        ctx.beginPath();
        for (let i = 0; i <= polygon.length; i++) {
            let j = i % polygon.length;
            let p = polygon[j];
            p = p.rotate(dir, pos);
            if (i > 0) ctx.lineTo(...p.xy);
            else ctx.moveTo(...p.xy);
        }
        ctx.fill();
        ctx.fillStyle = brighten((type in THEME2) ? THEME2[type] : THEME2DEFAULT, bright).toRGBA();
        this.renderShape(type, render, ctx);
        return rect;
    }
    static renderShape(type, render, ctx) {
        type = String(type);
        render = util.ensure(render, "obj");
        if (!(ctx instanceof CanvasRenderingContext2D)) throw "Cannot render without CanvasRenderingContext2D";
        let pos = new V(("pos" in render) ? render.pos : [ctx.canvas.width/2, ctx.canvas.height/2]);
        let size = new V(("size" in render) ? render.size : Math.min(ctx.canvas.width, ctx.canvas.height));
        let scale = new V(("scale" in render) ? render.scale : 1);
        let dir = util.ensure(render.dir, "num", 0);
        size.imul(scale);
        ctx.beginPath();
        if (type in SHAPES)
            util.ensure(SHAPES[type], "arr").forEach(shape => {
                shape = util.ensure(shape, "arr");
                for (let i = 0; i <= shape.length; i++) {
                    let j = i % shape.length;
                    let p = new V(shape[j]).mul(+1, -1);
                    p.imul(0.4 * ((type in SHAPESCALES) ? SHAPESCALES[type] : 1));
                    p.imul(size);
                    p.irotateOrigin(dir);
                    p.iadd(pos);
                    if (i > 0) ctx.lineTo(...p.xy);
                    else ctx.moveTo(...p.xy);
                }
            });
        ctx.fill("evenodd");
    }
    render() {
        if (!this.hasCanvas() || !this.hasCTX()) return;
        const canvas = this.canvas, ctx = this.ctx;
        let size = this.game.size;
        let screenSize = new V(canvas.width, canvas.height);
        let tileSize = screenSize.div(size);
        tileSize.x = tileSize.y = Math.min(tileSize.x, tileSize.y);
        let screenCenter = screenSize.div(2);
        let center = this.rPos.add(0.5).mul(tileSize);
        center.isub(size.mul(tileSize).div(2));
        center.imul(+1, -1);
        center.iadd(screenCenter);
        let alpha = 1;
        alpha = Math.min(alpha, 1 - (
            (this.rX < 0) ? -this.rX :
            (this.rX > size.x-1) ? this.rX-(size.x-1) :
            0
        ));
        alpha = Math.min(alpha, 1 - (
            (this.rY < 0) ? -this.rY :
            (this.rY > size.y-1) ? this.rY-(size.y-1) :
            0
        ));
        alpha = Math.max(alpha, 0);
        let rect = App.Game.Tile.render(this.type, {
            pos: center,
            size: tileSize,
            scale: this.rScale,
            dir: this.rDir,
            bright: this.rBright,
            alpha: alpha,
            theme: this.game.app.theme,
        }, ctx);
        this.rect.xy = rect.xy;
        this.rect.wh = rect.wh;
        this.post("render");
    }
};

window.app = new App();
