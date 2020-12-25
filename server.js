// get libraries
const
    io = require("socket.io"),
    readcommand = require('readcommand')

//server variables
var
    players = []; //players array
    clients = new Map(); //clients array
    playerTurn = 1;

//tictactoe variables
var
    board = ['.','.','.','.','.','.','.','.','.']
    turnCount = 0;

// win combinations    
let 
    win0_ = [1,2,3], // [1,1,1,0,0,0,0,0,0]
    win1_ = [4,5,6], // [0,0,0,1,1,1,0,0,0]
    win2_ = [7,8,9], // [0,0,0,0,0,0,1,1,1]
    win_0 = [1,4,7], // [1,0,0,1,0,0,1,0,0]
    win_1 = [2,5,8], // [0,1,0,0,1,0,0,1,0]
    win_2 = [3,6,9], // [0,0,1,0,0,1,0,0,1]
    win00 = [1,5,9], // [1,0,0,0,1,0,0,0,1]
    win11 = [3,5,7], // [0,0,1,0,1,0,1,0,0]
    winList = [ win0_, win1_, win2_, win_0, win_1, win_2, win00, win11];


//read command line
function readcli() {

    var promise = new Promise((resolve,reject) => {
        readcommand.read(function(err, args) {
        
            if (err) reject(err)
    
            resolve(args[0])
        });
    })

    return promise;
    
}

//set port
async function setPort() {
    await readcli().then((res) => {
        var server = io(res);
        console.log('The server has been successfully set on port',res)
        socketEvents(server);

    }).catch((err) => {
        console.log(err);
    });
}

setPort();

function socketEvents(server) {
    // event fired every time a new client connects:
    server.on("connection", (socket) => {

        // initialize this client's sequence number

        console.info(`Client connected --> socket id ${socket.id}`);
        
        if (server.engine.clientsCount == 1) {

            //set Player1
            players[0] = {
                Num : 1,
                Symbol : "X",
                ID: socket.id,
                Combination : []
            };

            clients.set(socket)
            socket.emit('playerNumMessage', players[0]);

        } else if (server.engine.clientsCount == 2) {
            
            //set Player2
            players[1] = {
                Num : 2,
                Symbol : "O",
                ID: socket.id,
                Combination : []
            };

            clients.set(socket)
            socket.emit('playerNumMessage', players[1]);
            //Game Begin

            for (const client of clients.entries()) {

                client[0].emit('gameBegin', {board, playerTurn})
            }

        }

        // when socket disconnects, remove it from the list:
        socket.on("disconnect", () => {
            clients.delete(socket);
            console.info(`Client gone --> socket id ${socket.id}`);

        });

        //whenever a player plays a turn
        socket.on("playTurn", (data) => {
            board = data.board;

            players[data.playerNum - 1].Combination.push(data.input);

            //switching between players
            switch(data.playerNum) {
                case 1: 
                    playerTurn = 2;
                    break;
                case 2:
                    playerTurn = 1;
                    break;
            }

            //letting both players know the new board
            for (const client of clients.entries()) {

                client[0].emit('changeTurn', {board, playerTurn})
            }

            turnCount++;

            if (turnCount == 9) {
                gameOver(0, server); //0 is for ties;
                return;
            }

            Promise.all(analyseBoard(data.playerNum)).then((results) => {
                if (results.includes(true)) gameOver(data.playerNum, server); //if any of the combinations is true, return the number of the analysed player, as he is the winner
            })


        });

        socket.on("playerResigned", (resignedPlayer) => {

            var tellTo; //variable to define who should be warned the other player resigned

            switch(resignedPlayer) {
                case 1: 
                    tellTo = 0;
                    break;
                case 2:
                    tellTo = 1;
                    break;
            }

            clients.get(players[tellTo].ID).emit('opponentResigned');

        })

    });
}

// analyse the board to check if it is a tie, someone has won or if the game continues
function analyseBoard(analysedPlayer) {

    let promises = [];

    //check if the player combination intersects with any of the win combinations
    winList.forEach(winCombination => {
        let filteredArray = players[analysedPlayer - 1].Combination.filter(value => winCombination.includes(value)); //array for storing intersection between the win combinations and the combinations given by each player

       promises.push(arraysEqual(filteredArray,winCombination));
    })

    return promises;
    
}

//check if two arrays are equal
function arraysEqual(_arr1, _arr2) {
    if (
      !Array.isArray(_arr1)
      || !Array.isArray(_arr2)
      || _arr1.length !== _arr2.length
      ) {
        return false;
      }
    
    const arr1 = _arr1.concat().sort();
    const arr2 = _arr2.concat().sort();
    
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) {
            return false;
         }
    }
    
    return true;
}

function gameOver(result, server) {
    if (result == 0) {
        server.emit('tie');
    } else {
        server.emit('someoneWon', result);
    }
    resetServer();
}

function resetServer(){

    players = [];
    clients = new Map();
    playerTurn = 1;
    board = ['.','.','.','.','.','.','.','.','.'];
    turnCount = 0;

}