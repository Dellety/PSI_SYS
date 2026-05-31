#!/bin/bash
# PSI_SYS 开发环境启动脚本

set -e
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
PID_DIR="$ROOT_DIR/.pids"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[PSI]${NC} $1"; }
warn() { echo -e "${YELLOW}[PSI]${NC} $1"; }
err()  { echo -e "${RED}[PSI]${NC} $1"; }

mkdir -p "$PID_DIR"

check_port() {
    lsof -ti:"$1" 2>/dev/null
}

wait_port() {
    local port=$1 name=$2 max=30 i=0
    while [ $i -lt $max ]; do
        if check_port "$port" >/dev/null 2>&1; then
            return 0
        fi
        i=$((i+1))
        sleep 1
    done
    return 1
}

start_backend() {
    if check_port 8000 >/dev/null 2>&1; then
        warn "后端已在运行 (端口 8000)"
        return 0
    fi

    log "启动后端..."
    cd "$BACKEND_DIR"

    # 检查是否需要初始化种子数据
    if [ ! -f psi_sys.db ] || [ ! -s psi_sys.db ]; then
        log "初始化数据库..."
        ./.venv/bin/python -m app.seed
    fi

    ./.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 \
        > "$PID_DIR/backend.log" 2>&1 &
    echo $! > "$PID_DIR/backend.pid"

    if wait_port 8000 "后端"; then
        log "后端已启动 → http://localhost:8000"
        log "API 文档 → http://localhost:8000/docs"
    else
        err "后端启动失败，查看日志: $PID_DIR/backend.log"
        return 1
    fi
}

start_frontend() {
    if check_port 5173 >/dev/null 2>&1; then
        warn "前端已在运行 (端口 5173)"
        return 0
    fi

    log "启动前端..."
    cd "$FRONTEND_DIR"

    # 首次安装依赖
    if [ ! -d node_modules ]; then
        log "安装前端依赖..."
        npm install
    fi

    npx vite --port 5173 \
        > "$PID_DIR/frontend.log" 2>&1 &
    echo $! > "$PID_DIR/frontend.pid"

    if wait_port 5173 "前端"; then
        log "前端已启动 → http://localhost:5173"
    else
        err "前端启动失败，查看日志: $PID_DIR/frontend.log"
        return 1
    fi
}

stop_service() {
    local name=$1 port=$2
    local pidfile="$PID_DIR/${name}.pid"

    if [ -f "$pidfile" ]; then
        local pid=$(cat "$pidfile")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null
            log "已停止 $name (PID: $pid)"
        fi
        rm -f "$pidfile"
    fi

    # 兜底：按端口杀进程
    local pids=$(check_port "$port")
    if [ -n "$pids" ]; then
        echo "$pids" | xargs kill 2>/dev/null
        log "已清理端口 $port 上的进程"
    fi
}

show_status() {
    echo ""
    echo "┌─────────────────────────────────────┐"
    echo "│       PSI_SYS 开发环境状态           │"
    echo "├──────────┬──────────┬────────────────┤"
    printf "│ %-8s │ %-8s │ %-14s │\n" "服务" "端口" "状态"
    echo "├──────────┼──────────┼────────────────┤"

    if check_port 8000 >/dev/null 2>&1; then
        printf "│ %-8s │ %-8s │ ${GREEN}%-14s${NC} │\n" "后端" "8000" "✓ 运行中"
    else
        printf "│ %-8s │ %-8s │ %-14s │\n" "后端" "8000" "✗ 未启动"
    fi

    if check_port 5173 >/dev/null 2>&1; then
        printf "│ %-8s │ %-8s │ ${GREEN}%-14s${NC} │\n" "前端" "5173" "✓ 运行中"
    else
        printf "│ %-8s │ %-8s │ %-14s │\n" "前端" "5173" "✗ 未启动"
    fi

    echo "└──────────┴──────────┴────────────────┘"
    echo ""
}

case "${1:-start}" in
    start)
        echo ""
        log "🚀 启动 PSI_SYS 开发环境..."
        echo ""
        start_backend
        start_frontend
        echo ""
        log "✅ 全部就绪！"
        show_status
        log "测试账号: admin/admin123, sales01/123456, pm01/123456, buyer01/123456"
        echo ""

        # 交互式停止功能
        log "输入 ${YELLOW}stop${NC} 停止服务 (或按 Ctrl+C 退出)"
        echo -n "> "
        while read -r cmd; do
            case "$cmd" in
                stop|STOP|s)
                    echo ""
                    log "停止开发环境..."
                    stop_service frontend 5173
                    stop_service backend 8000
                    log "已停止"
                    exit 0
                    ;;
                quit|exit|q)
                    echo ""
                    log "退出监控（服务继续运行）"
                    exit 0
                    ;;
                status)
                    show_status
                    ;;
                *)
                    warn "未知命令: $cmd"
                    log "可用命令: stop (停止服务), status (查看状态), quit (退出监控)"
                    ;;
            esac
            echo -n "> "
        done
        ;;

    stop)
        log "停止开发环境..."
        stop_service frontend 5173
        stop_service backend 8000
        log "已停止"
        ;;

    restart)
        $0 stop
        sleep 1
        $0 start
        ;;

    status)
        show_status
        ;;

    seed)
        log "重新初始化种子数据..."
        cd "$BACKEND_DIR"
        # 删除旧数据库重新创建
        rm -f psi_sys.db
        ./.venv/bin/python -m app.seed
        log "种子数据初始化完成"
        ;;

    log|logs)
        local target="${2:-}"
        case "$target" in
            backend|b) tail -f "$PID_DIR/backend.log" ;;
            frontend|f) tail -f "$PID_DIR/frontend.log" ;;
            *) tail -f "$PID_DIR/backend.log" "$PID_DIR/frontend.log" ;;
        esac
        ;;

    *)
        echo "用法: $0 {start|stop|restart|status|seed|log [backend|frontend]}"
        echo ""
        echo "  start    启动后端 + 前端"
        echo "  stop     停止所有服务"
        echo "  restart  重启所有服务"
        echo "  status   查看运行状态"
        echo "  seed     重新初始化种子数据"
        echo "  log      查看实时日志 (可选 backend/frontend)"
        exit 1
        ;;
esac
