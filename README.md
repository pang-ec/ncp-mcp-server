# NCP MCP Server

Naver Cloud Platform (NCP) Model Context Protocol (MCP) Server for Claude Desktop

## 📋 프로젝트 소개

Claude Desktop과 연동하여 NCP(Naver Cloud Platform)의 인프라를 대화형으로 관리할 수 있는 MCP 서버입니다. Claude AI와 자연어로 대화하면서 클라우드 리소스를 생성, 조회, 관리할 수 있습니다.

## ✨ 주요 기능

### 서버 관리
- 서버 인스턴스 생성/시작/중지/삭제
- 서버 목록 조회 및 상세 정보 확인

### 네트워크 관리
- VPC (Virtual Private Cloud) 생성/조회/삭제
- Subnet 생성/조회/삭제
- ACG (Access Control Group) 생성/조회/삭제
- 보안 규칙 추가

### 로드 밸런서
- Load Balancer 생성/조회/삭제
- 타겟 서버 등록 및 관리

### 데이터베이스
- Cloud DB 인스턴스 생성/조회/삭제

## 🛠 기술 스택

- **Language**: TypeScript
- **Runtime**: Node.js
- **Framework**: Model Context Protocol (MCP) SDK
- **API**: Naver Cloud Platform REST API
- **Authentication**: NCP API Key (HMAC-SHA256 Signature)

## 📦 설치 방법

### 1. 저장소 클론

```bash
git clone https://github.com/YOUR_USERNAME/ncp-mcp-server.git
cd ncp-mcp-server
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

`.env` 파일을 생성하고 NCP API 키를 설정합니다:

```bash
NCP_ACCESS_KEY=your_access_key_here
NCP_SECRET_KEY=your_secret_key_here
```

### 4. 빌드

```bash
npm run build
```

## 🚀 사용 방법

### Claude Desktop 설정

Claude Desktop의 설정 파일에 MCP 서버를 추가합니다:

**macOS/Linux**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ncp-compute": {
      "command": "node",
      "args": ["/path/to/ncp-compute-mcp-server/dist/index.js"],
      "env": {
        "NCP_ACCESS_KEY": "your_access_key",
        "NCP_SECRET_KEY": "your_secret_key"
      }
    }
  }
}
```

### Claude Desktop에서 사용

Claude Desktop을 재시작한 후, 다음과 같이 자연어로 명령할 수 있습니다:

```
- "NCP 서버 목록 보여줘"
- "web-server-1 이름으로 서버 생성해줘"
- "서버 시작해줘"
- "로드 밸런서 생성해줘"
```

## 📝 API 목록

### Server APIs
- `list_servers` - 서버 인스턴스 목록 조회
- `get_server_detail` - 서버 상세 정보 조회
- `create_server` - 서버 생성
- `start_server` - 서버 시작
- `stop_server` - 서버 중지
- `delete_server` - 서버 삭제

### VPC APIs
- `list_vpcs` - VPC 목록 조회
- `create_vpc` - VPC 생성
- `delete_vpc` - VPC 삭제

### Subnet APIs
- `list_subnets` - Subnet 목록 조회
- `create_subnet` - Subnet 생성
- `delete_subnet` - Subnet 삭제

### ACG APIs
- `list_acgs` - ACG 목록 조회
- `create_acg` - ACG 생성
- `delete_acg` - ACG 삭제
- `add_acg_rule` - 인바운드 규칙 추가

### Load Balancer APIs
- `list_load_balancers` - Load Balancer 목록 조회
- `create_load_balancer` - Load Balancer 생성
- `delete_load_balancer` - Load Balancer 삭제
- `add_load_balancer_target` - 타겟 서버 추가

### Cloud DB APIs
- `list_cloud_dbs` - Cloud DB 목록 조회
- `create_cloud_db` - Cloud DB 생성
- `delete_cloud_db` - Cloud DB 삭제

## 🔐 보안

- NCP API 인증은 HMAC-SHA256 서명 방식 사용
- API 키는 환경 변수로 관리
- `.env` 파일은 `.gitignore`에 포함되어 버전 관리에서 제외

## 🐛 트러블슈팅

### 401 Unauthorized 오류
- API 키가 올바른지 확인
- 서명 생성 시 쿼리 파라미터가 포함되는지 확인

### 404 Not Found 오류
- API 엔드포인트 경로 확인
- NCP API 버전 확인

### 400 Bad Request 오류
- 필수 파라미터 누락 확인 (예: serverCreateCount)
- 파라미터 형식 확인

## 📚 참고 자료

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [NCP API Documentation](https://api.ncloud-docs.com/)
- [Claude Desktop](https://claude.ai/download)

## 🎯 향후 계획

- [ ] Object Storage API 추가
- [ ] Monitoring (Cloud Insight) API 추가
- [ ] Auto Scaling API 추가
- [ ] Block Storage 관리 기능
- [ ] 인프라 자동 구축 템플릿
- [ ] 에러 핸들링 개선



