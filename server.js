const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const schedule = require('node-schedule');
const path = require('path');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// 초기 데이터 세팅
let mealStatusData = {
    "1-1": { grade: 1, class: 1, status: "교실 대기 중" },
    "1-2": { grade: 1, class: 2, status: "교실 대기 중" },
    "1-3": { grade: 1, class: 3, status: "교실 대기 중" },
    "1-4": { grade: 1, class: 4, status: "교실 대기 중" },
    "1-5": { grade: 1, class: 5, status: "교실 대기 중" },
    "1-6": { grade: 1, class: 6, status: "교실 대기 중" },
    "1-7": { grade: 1, class: 7, status: "교실 대기 중" }
};

// 매일 자정(00:00) 초기화
schedule.scheduleJob('0 0 * * *', () => {
    for (const id in mealStatusData) {
        mealStatusData[id].status = "교실 대기 중";
    }
    io.emit('initial_data', mealStatusData);
});

io.on('connection', (socket) => {
    console.log('사용자 접속:', socket.id);
    
    // 접속하자마자 현재 저장된 데이터를 즉시 전송
    socket.emit('initial_data', mealStatusData);

    // 혹시 모를 타이밍 이슈 방지를 위해 요청 시 재전송하는 이벤트 추가
    socket.on('request_initial_data', () => {
        socket.emit('initial_data', mealStatusData);
    });

    socket.on('add_class', (data) => {
        const { grade, className } = data;
        const id = `${grade}-${className}`;
        
        if (!mealStatusData[id]) {
            mealStatusData[id] = {
                grade: parseInt(grade),
                class: parseInt(className),
                status: "교실 대기 중"
            };
            io.emit('initial_data', mealStatusData);
        }
    });

    socket.on('change_status', (data) => {
        const { id, status } = data;
        if (mealStatusData[id]) {
            mealStatusData[id].status = status;
            io.emit('status_updated', { id, status });
        }
    });
});

server.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT} 에서 구동 중입니다.`);
});
