// get libraries
const
    io = require("socket.io-client"),
    readcommand = require('readcommand')

//tictactoe variables stored for each client

var currentPlayer = {};

//read command line
function readcli() {

    var promise = new Promise((resolve,reject) => {
        readcommand.read(function(err, args) {
        
            if (err) reject(err)
    
            resolve(args)
        });
    })

    return promise;
    
}

//set port and URL
async function setURLandPort() {
    await readcli().then((res) => {
        const server = io.connect("http://" + res[0] + ":" + res[1]);
        console.log('Waiting for connection...')
        clientEvents(server);

    }).catch((err) => {
        console.log(err);
    });
}

setURLandPort();

function clientEvents(server) {
    //on connection
    server.on('connect', () => console.log('connected to',server.io.engine.hostname));

    //letting player know their player number
    server.on("playerNumMessage", (player) => {
        console.info("You are player #",player.Num);
        currentPlayer = {
            Num : player.Num,
            Symbol : player.Symbol,
            ID : player.ID
        }
    });

    //trigger when game begins
    server.on('gameBegin', (data) => {
        
        if (currentPlayer.Num == 1) {
            console.log('Game Started. You are first.')
        } else if (currentPlayer.Num == 2) {
            console.log('Game Started. You are second.')
        }

        printBoard(data.board);

        playLogic(data,server);

    });

    // when a player plays a turn
    server.on('changeTurn', (data) => {
        if (data.playerTurn == currentPlayer.Num) {
            console.log('Your opponent has played. It is your turn now.')
        }
        else console.log('Wait for your opponent\'s turn')

        printBoard(data.board);

        playLogic(data,server);

    })

    server.on('opponentResigned', () => {
        console.log("Your opponent has resigned. You won!");
        process.exit();
    });

    //if the server gets down or the client disconnects 
    server.on('disconnect', () => {
        console.log("You have been disconnected from the server!");
        process.exit();
    });

    //event for ties
    server.on('tie', () => {
        console.log('Game is tied!');
        server.disconnect();
    })

    //event in case someone wins
    server.on('someoneWon', (victoriousPlayer) => {
        console.log("Game won by player #" + victoriousPlayer);
        process.exit(0);
    })

    
}

function printBoard(board) {
    console.log('\n',
                board[0],board[1],board[2],'\n',
                board[3],board[4],board[5],'\n',
                board[6],board[7],board[8],'\n',)
}

function playTurn(userInput, board,input, server) {
 
    board[userInput - 1] = currentPlayer.Symbol;

    server.emit('playTurn', {
        board : board,
        playerNum : currentPlayer.Num,
        input : parseInt(input)
    });

}

//defines the logic to follow as players play
function playLogic(data, server) {
    if (data.playerTurn == currentPlayer.Num) readcli()

    .then((res) => {
        
        if (res == 'r') resign(server);

        //play turn
        playTurn(res[0], data.board,res[0], server);

    });
}

function resign(server) {
    console.log('You have chosen to resign. Disconnecting from server...')
    server.emit('playerResigned', currentPlayer.Num);
    process.exit(1);
}