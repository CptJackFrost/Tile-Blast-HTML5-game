window.onload = function() {
    let canvas = document.getElementById("viewport");
    let context = canvas.getContext("2d");
    
    let lastframe = 0;
    let fpstime = 0;
    let framecount = 0;
    let fps = 0;
    
    let level = {
        x: 250,
        y: 113,
        columns: 8,
        rows: 8,
        tilewidth: 40,
        tileheight: 40,
        tiles: [],
        selectedtile: { selected: false, column: 0, row: 0 }
    };
    
    //массив с цветами тайлов
    //вместо цветов можно использовать координаты на спрайтшите (если он будет)
    let tilecolors = [[255, 128, 128],
                      [128, 255, 128],
                      [128, 128, 255],
                      [255, 255, 128],
                      [255, 128, 255],
                      [128, 255, 255],
                      [255, 255, 255]];
    
    let minClusterSize = 2;
    let cluster = []; //массив с кластером
    

    let S = 3;      //перемешиваний
    let Y = 10;     //ходов до проигрыша

    let gamestates = { init: 0, ready: 1, resolve: 2 };
    let gamestate = gamestates.init;
    let shuffles = S;  //текущее число перемешиваний
    let movesLeft = Y; //ходов осталось
    
    let score = 0;
    let goal = 10000; //сколько нужно набрать
    
    let animationstate = 0;
    let animationtime = 0;
    let animationtimetotal = 0.3;
    
    let gameover = false;
    
    // кнопки интерфейса
    let buttons = [ { x: 30, y: 270, width: 150, height: 50, text: "Новая игра"} ];
    
    // Initialize the game
    function init() {
        canvas.addEventListener("click", onClick);
        
        for (let i=0; i<level.columns; i++) {
            level.tiles[i] = [];
            for (let j=0; j<level.rows; j++) {
                level.tiles[i][j] = { type: 0, shift:0, coorx: i, coory: j}
            }
        }
        
        newGame();
        
        main(0);
    }
    
    function main(tframe) {
        window.requestAnimationFrame(main);
        
        update(tframe);
        render();
    }
    
    function update(tframe) {
        let dt = (tframe - lastframe) / 1000;
        lastframe = tframe;
        
        updateFps(dt);
        
        if (gamestate == gamestates.ready) {
            if (score >= goal || movesLeft <= 0) {
                gameover = true;
            }

            if (!findMove()){
                if (shuffles >= 1){
                    shuffle();
                    shuffles--;
                    console.log(shuffles);
                } else {
                    gameover = true;
                }
            }

        } else

        if (gamestate == gamestates.resolve) {
            animationtime += dt;
            
            if (animationstate === 0) {

                if (animationtime > animationtimetotal) {
                    
                    //считаем очки
                    if (cluster.length >= minClusterSize) {
                        for (let i=0; i<cluster.length; i++) {
                            score += 100 * (cluster.length + (1 - minClusterSize));
                        }

                        movesLeft--;

                        removeClusters();
                        cluster = [];
                        
                        animationstate = 1;
                    } else {
                        gamestate = gamestates.ready;
                    }
                    animationtime = 0;
                }
            } else if (animationstate === 1) {
                if (animationtime > animationtimetotal) {
                    shiftTiles();
                    
                    animationstate = 0;
                    animationtime = 0;
                    
                    if (cluster.length <= 0) {
                        gamestate = gamestates.ready;
                    }
                }
            }
        }
    }
    
    function updateFps(dt) {
        if (fpstime > 0.25) {
            fps = Math.round(framecount / fpstime);
            
            fpstime = 0;
            framecount = 0;
        }
        
        fpstime += dt;
        framecount++;
    }
    
    function drawCenterText(text, x, y, width) {
        let textdim = context.measureText(text);
        context.fillText(text, x + (width-textdim.width)/2, y);
    }
    
    // Render the game
    function render() {
        drawFrame();
        
        // Счетчик очков
        context.fillStyle = "#000000";
        context.font = "24px Verdana";
        drawCenterText("Очки:", 30, level.y+30, 150);
        drawCenterText(score, 30, level.y+60, 150);

        context.font = "16px Verdana";
        drawCenterText("Осталось ходов:", 30, level.y+90, 150);
        drawCenterText(movesLeft, 30, level.y+110, 150);

        
        drawButtons();
        


        let levelwidth = level.columns * level.tilewidth;
        let levelheight = level.rows * level.tileheight;
        context.fillStyle = "#000000";
        context.fillRect(level.x - 4, level.y - 4, levelwidth + 8, levelheight + 8);
        
        renderTiles();
        
        // оверлей
        if (gameover) {
            context.fillStyle = "rgba(0, 0, 0, 0.8)";
            context.fillRect(level.x, level.y, levelwidth, levelheight);
            
            context.fillStyle = "#ffffff";
            context.font = "24px Verdana";
            if (score >= goal){
                drawCenterText("Congratulations! You won!", level.x, level.y + levelheight / 2 + 10, levelwidth);
            } else {
                drawCenterText("Game Over!", level.x, level.y + levelheight / 2 + 10, levelwidth);
            }

        }
    }
    
    function drawFrame() {
        // фон и рамка фрейма
        context.fillStyle = "#d0d0d0";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#e8eaec";
        context.fillRect(1, 1, canvas.width-2, canvas.height-2);
        
        // шапка
        context.fillStyle = "#303030";
        context.fillRect(0, 0, canvas.width, 65);
        
        // Заголовок
        context.fillStyle = "#ffffff";
        context.font = "24px Verdana";
        context.fillText("Tile blast  - Prototype", 10, 30);
        
        // фпс
        context.fillStyle = "#ffffff";
        context.font = "12px Verdana";
        context.fillText("Fps: " + fps, 13, 50);
    }
    
    function drawButtons() {
        for (let i=0; i<buttons.length; i++) {
            context.fillStyle = "#000000";
            context.fillRect(buttons[i].x, buttons[i].y, buttons[i].width, buttons[i].height);
            
            context.fillStyle = "#ffffff";
            context.font = "18px Verdana";
            let textdim = context.measureText(buttons[i].text);
            context.fillText(buttons[i].text, buttons[i].x + (buttons[i].width-textdim.width)/2, buttons[i].y+30);
        }
    }
    
    function renderTiles() {
        for (let i=0; i<level.columns; i++) {
            for (let j=0; j<level.rows; j++) {
                let shift = level.tiles[i][j].shift;
                
                let coord = getTileCoordinate(i, j, 0, (animationtime / animationtimetotal) * shift);
                
                if (level.tiles[i][j].type >= 0) {
                    let col = tilecolors[level.tiles[i][j].type];
                    
                    drawTile(coord.tilex, coord.tiley, col[0], col[1], col[2]);
                }
            }
        }
    }
    
    function getTileCoordinate(column, row, columnoffset, rowoffset) {
        let tilex = level.x + (column + columnoffset) * level.tilewidth;
        let tiley = level.y + (row + rowoffset) * level.tileheight;
        return { tilex: tilex, tiley: tiley};
    }
    
    // тайл в виде разноцветного квадратика
    // здесь можно будет поменять на спрайт
    function drawTile(x, y, r, g, b) {
        context.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
        context.fillRect(x + 2, y + 2, level.tilewidth - 4, level.tileheight - 4);
    }
    
    function newGame() {
        score = 0;
        movesLeft = Y;
        shuffles = S;
        gamestate = gamestates.ready;        
        gameover = false;
        createLevel();
    }
    
    function createLevel() {
        let done = false;

        //заполняем поле рандомными тайлами
        //пока не выпадет комбинация, где есть хотя бы один ход
        
        while (!done) {    
            for (let i=0; i<level.columns; i++) {
                for (let j=0; j<level.rows; j++) {
                    level.tiles[i][j].type = getRandomTile();
                }
            }            
            if (findMove()) {
                done = true;
            }
        }
    }
    
    function getRandomTile() {
        return Math.floor(Math.random() * tilecolors.length);
    }


    //магия рекурсии
    function findCluster(x, y, clus){

        let clusterType = level.tiles[x][y].type;

        //соседи тайла (если они есть)
        let upper = (level.tiles[x][y-1] === undefined ? null : level.tiles[x][y-1]);
        let lower = (level.tiles[x][y+1] === undefined ? null : level.tiles[x][y+1]);
        let left = (level.tiles[x-1]  === undefined ? null : level.tiles[x-1][y]);
        let right = (level.tiles[x+1] === undefined ? null : level.tiles[x+1][y]);

        //запихать в массив для удобства
        let neighboors = [upper, lower, left, right];

        //массив кластера должен на вызове стать копией того, что передано в функцию
        cluster = clus.slice();

        //проверяем всех соседей
        //если...
        for (let neighboor of neighboors){
            if (neighboor !== null                      //...он вообще есть &&
                &&neighboor.type === clusterType        //   он того же цвета &&  
                && !(cluster.includes(neighboor))) {    //   если его еще нет в массиве кластера
                    cluster.push(neighboor);
                    findCluster(neighboor.coorx, neighboor.coory, cluster);
            }
        }

        return cluster;
    }


    function findMove() {

        //ищем, есть ли на поле хотя бы один кластер
        //если находим - дальше не ищем

        let moveFound = false;
        
        for (let i = 0; i < level.rows; i++){
            if (!moveFound){
                for (let j = 0; j < level.columns; j++){
                    findCluster(i, j, [level.tiles[i][j]]);
                    if (cluster.length >= minClusterSize){
                        moveFound = true;
                        break;
                    }
                }
            } else {
                break;
            }
        }

        return moveFound;        
        
    }
    

    function removeClusters() {        
        //меняем тип каждого тайла, помечая его, как "взорвавшийся"
        for (let tile of cluster){
            level.tiles[tile.coorx][tile.coory].type = -1;
        }

        //задаем параметр shift для смещения
        for (let i=0; i<level.columns; i++) {
            let shift = 0;
            for (let j=level.rows-1; j>=0; j--) {
                if (level.tiles[i][j].type == -1) {
                    shift++;
                    level.tiles[i][j].shift = 0;
                } else {
                    level.tiles[i][j].shift = shift;
                }
            }
        }
    }
    
    //смещаем тайлы вниз, вставляем на пустоты новые
    function shiftTiles() {
        for (let i=0; i<level.columns; i++) {
            for (let j=level.rows-1; j>=0; j--) {
                if (level.tiles[i][j].type == -1) {
                    level.tiles[i][j].type = getRandomTile();
                } else {
                    let shift = level.tiles[i][j].shift;
                    if (shift > 0) {
                        swap(i, j, i, j+shift)
                    }
                }
                level.tiles[i][j].shift = 0;
            }
        }
    }
    
    function getMouseTile(pos) {
        let tx = Math.floor((pos.x - level.x) / level.tilewidth);
        let ty = Math.floor((pos.y - level.y) / level.tileheight);
        
        if (tx >= 0 && tx < level.columns && ty >= 0 && ty < level.rows) {
            return {
                valid: true,
                x: tx,
                y: ty
            };
        }
        
        //если клик не на тайл
        return {
            valid: false,
            x: 0,
            y: 0
        };
    }
    
    function swap(x1, y1, x2, y2) {
        let typeswap = level.tiles[x1][y1].type;
        level.tiles[x1][y1].type = level.tiles[x2][y2].type;
        level.tiles[x2][y2].type = typeswap;
    }
    
    
    function onClick(e) {
        let pos = getMousePos(canvas, e);
        
            // куда кликнули
            mt = getMouseTile(pos);
            
            //на тайл
            if (mt.valid) {
                if (!gameover){
                    findCluster(mt.x, mt.y, [level.tiles[mt.x][mt.y]]);
                    if (cluster.length >= minClusterSize) {
                        gamestate = gamestates.resolve;
                        animationtime = 0;
                        animationstate = 0;
                    }
                }
            }
        
        // на кнопку
        for (let i=0; i<buttons.length; i++) {
            if (pos.x >= buttons[i].x && pos.x < buttons[i].x+buttons[i].width &&
                pos.y >= buttons[i].y && pos.y < buttons[i].y+buttons[i].height) {
                
                if (i == 0) {
                    // новая игра
                    newGame();
                }
            }
        }
    }

    function getMousePos(canvas, e) {
        let rect = canvas.getBoundingClientRect();
        return {
            x: Math.round((e.clientX - rect.left)/(rect.right - rect.left)*canvas.width),
            y: Math.round((e.clientY - rect.top)/(rect.bottom - rect.top)*canvas.height)
        };
    }

    function shuffle() {
        let randx;
        let randy;
        let temp;

        for (let i = level.columns-1; i > 0; i--){
            for (let j = level.rows-1; j > 0; j--){
                randy = Math.floor(Math.random()*(j + 1));
                randx = Math.floor(Math.random()*(i + 1));
                temp = level.tiles[randx][randy];
                level.tiles[randx][randy] = level.tiles[i][j];
                level.tiles[i][j] = temp;
            }
        }

      }
    
    init();
};