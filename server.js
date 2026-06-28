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

// 초기 화면에 1학년 1반부터 7반까지 기본으로 등록해 둡니다.
let mealStatusData = {
    "1-1": { grade: 1, class: 1, status: "교실 대기 중" },
    "1-2": { grade: 1, class: 2, status: "교실 대기 중" },
    "1-3": { grade: 1, class: 3, status: "교실 대기 중" },
    "1-4": { grade: 1, class: 4, status: "교실 대기 중" },
    "1-5": { grade: 1, class: 5, status: "교실 대기 중" },
    "1-6": { grade: 1, class: 6, status: "교실 대기 중" },
    "1-7": { grade: 1, class: 7, status: "교실 대기 중" }
};

// 매일 자정(00:00)에 모든 학반의 상태를 '교실 대기 중'으로 초기화
schedule.scheduleJob('0 0 * * *', () => {
    console.log('자정이 되어 급식 현황을 초기화합니다.');
    for (const id in mealStatusData) {
        mealStatusData[id].status = "교실 대기 중";
    }
    io.emit('initial_data', mealStatusData);
});

io.on('connection', (socket) => {
    console.log('새로운 사용자가 접속했습니다. 익명 ID:', socket.id);
    socket.emit('initial_data', mealStatusData);

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

    socket.on('disconnect', () => {
        console.log('사용자가 접속을 종료했습니다.');
    });
});

server.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT} 에서 원활히 구동 중입니다.`);
});
