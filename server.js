const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const schedule = require('node-schedule');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // 모든 기기에서의 접근을 허용
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// 정적 파일 제공 (public 폴더)
app.use(express.static(path.join(__dirname, 'public')));

// 메모리 데이터 저장소 (서버 재시작 전까지 유지)
// 구조: { "1-1": { grade: 1, class: 1, status: "교실 대기 중" } }
let mealStatusData = {};

// 매일 자정(00:00)에 모든 학반의 상태를 '교실 대기 중'으로 초기화
schedule.scheduleJob('0 0 * * *', () => {
    console.log('자정이 되어 급식 현황을 초기화합니다.');
    for (const id in mealStatusData) {
        mealStatusData[id].status = "교실 대기 중";
    }
    // 모든 접속자에게 초기화된 데이터 브로드캐스팅
    io.emit('initial_data', mealStatusData);
});

io.on('connection', (socket) => {
    console.log('새로운 사용자가 접속했습니다. 익명 ID:', socket.id);

    // 접속 시 현재 유저에게 기존 데이터 전송
    socket.emit('initial_data', mealStatusData);

    // 새로운 학반 추가 이벤트 처리
    socket.on('add_class', (data) => {
        const { grade, className } = data;
        const id = `${grade}-${className}`;
        
        if (!mealStatusData[id]) {
            mealStatusData[id] = {
                grade: parseInt(grade),
                class: parseInt(className),
                status: "교실 대기 중"
            };
            // 모든 접속자에게 업데이트된 데이터 전송
            io.emit('initial_data', mealStatusData);
        }
    });

    // 급식 상태 변경 이벤트 처리
    socket.on('change_status', (data) => {
        const { id, status } = data;
        if (mealStatusData[id]) {
            mealStatusData[id].status = status;
            // 변경된 상태를 나를 포함한 모든 접속자에게 브로드캐스팅
            io.emit('status_updated', { id, status });
        }
    });

    socket.on('disconnect', () => {
        console.log('사용자가 접속을 종료했습니다.');
    });
});

server.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 원활히 구동 중입니다.`);
});
