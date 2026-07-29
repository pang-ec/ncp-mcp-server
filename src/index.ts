#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import crypto from "crypto";
import https from "https";

// NCP API 인증 헬퍼
function generateSignature(
  method: string,
  url: string,
  timestamp: string,
  accessKey: string,
  secretKey: string
): string {
  const space = " ";
  const newLine = "\n";
  const hmac = crypto.createHmac("sha256", secretKey);

  hmac.update(method);
  hmac.update(space);
  hmac.update(url);
  hmac.update(newLine);
  hmac.update(timestamp);
  hmac.update(newLine);
  hmac.update(accessKey);

  return hmac.digest("base64");
}

// NCP API 클라이언트
class NCPClient {
  private accessKey: string;
  private secretKey: string;
  private apiUrl: string;

  constructor(accessKey: string, secretKey: string) {
    this.accessKey = accessKey;
    this.secretKey = secretKey;
    this.apiUrl = "https://ncloud.apigw.ntruss.com";
  }

  private async request(method: string, apiPath: string, endpoint: string, params?: any) {
    const timestamp = Date.now().toString();
    
    let url = `${apiPath}${endpoint}`;
    if (method === "GET" && params && Object.keys(params).length > 0) {
      const queryString = new URLSearchParams(params).toString();
      url = `${url}?${queryString}`;
    }
    
    const signature = generateSignature(
      method,
      url,
      timestamp,
      this.accessKey,
      this.secretKey
    );

    const config: any = {
      method,
      url: `${this.apiUrl}${url}`,
      headers: {
        "x-ncp-apigw-timestamp": timestamp,
        "x-ncp-iam-access-key": this.accessKey,
        "x-ncp-apigw-signature-v2": signature,
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    };

    if (method === "POST") {
      config.headers["Content-Type"] = "application/x-www-form-urlencoded";
      config.data = new URLSearchParams(params).toString();
    }

    try {
      const response = await axios(config);
      return response.data;
    } catch (error: any) {
      throw new Error(`NCP API Error: ${error.response?.data?.message || error.message}`);
    }
  }

  // ===== Server APIs =====
  async listServers(regionCode?: string) {
    const params: any = {};
    if (regionCode) params.regionCode = regionCode;
    return await this.request("GET", "/vserver/v2", "/getServerInstanceList", params);
  }

  async getServerDetail(serverInstanceNo: string) {
    return await this.request("GET", "/vserver/v2", "/getServerInstanceDetail", {
      serverInstanceNo,
    });
  }

  async createServer(params: {
    serverName: string;
    serverImageProductCode: string;
    serverProductCode: string;
    vpcNo?: string;
    subnetNo?: string;
    loginKeyName?: string;
    serverCreateCount?: string;
  }) {
    const finalParams = {
      ...params,
      serverCreateCount: params.serverCreateCount || "1"
    };
    return await this.request("POST", "/vserver/v2", "/createServerInstances", finalParams);
  }

  async deleteServer(serverInstanceNo: string) {
    return await this.request("GET", "/vserver/v2", "/terminateServerInstances", {
      "serverInstanceNoList.1": serverInstanceNo
    });
  }

  async stopServer(serverInstanceNo: string) {
    return await this.request("GET", "/vserver/v2", "/stopServerInstances", {
      "serverInstanceNoList.1": serverInstanceNo
    });
  }

  async startServer(serverInstanceNo: string) {
    return await this.request("GET", "/vserver/v2", "/startServerInstances", {
      "serverInstanceNoList.1": serverInstanceNo
    });
  }

  // ===== VPC APIs =====
  async listVpcs() {
    return await this.request("GET", "/vserver/v2", "/getVpcList", {});
  }

  async createVpc(params: {
    vpcName: string;
    ipv4CidrBlock: string;
  }) {
    return await this.request("GET", "/vserver/v2", "/createVpc", params);
  }

  async deleteVpc(vpcNo: string) {
    return await this.request("GET", "/vserver/v2", "/deleteVpc", { vpcNo });
  }

  // ===== Subnet APIs =====
  async listSubnets(vpcNo?: string) {
    const params: any = {};
    if (vpcNo) params.vpcNo = vpcNo;
    return await this.request("GET", "/vserver/v2", "/getSubnetList", params);
  }

  async createSubnet(params: {
    subnetName: string;
    vpcNo: string;
    subnet: string;
    zoneCode: string;
    networkAclNo: string;
    subnetTypeCode: string;
  }) {
    return await this.request("GET", "/vserver/v2", "/createSubnet", params);
  }

  async deleteSubnet(subnetNo: string) {
    return await this.request("GET", "/vserver/v2", "/deleteSubnet", { subnetNo });
  }

  // ===== ACG (Access Control Group) APIs =====
  async listAcgs(vpcNo?: string) {
    const params: any = {};
    if (vpcNo) params.vpcNo = vpcNo;
    return await this.request("GET", "/vserver/v2", "/getAccessControlGroupList", params);
  }

  async createAcg(params: {
    accessControlGroupName: string;
    vpcNo: string;
    accessControlGroupDescription?: string;
  }) {
    return await this.request("GET", "/vserver/v2", "/createAccessControlGroup", params);
  }

  async deleteAcg(accessControlGroupNo: string) {
    return await this.request("GET", "/vserver/v2", "/deleteAccessControlGroup", {
      accessControlGroupNo
    });
  }

  async addAcgRule(params: {
    accessControlGroupNo: string;
    protocolTypeCode: string;
    ipBlock?: string;
    portRange?: string;
    accessControlGroupSequence?: string;
  }) {
    return await this.request("GET", "/vserver/v2", "/addAccessControlGroupInboundRule", params);
  }

  // ===== Load Balancer APIs =====
  async listLoadBalancers() {
    return await this.request("GET", "/vloadbalancer/v2", "/getLoadBalancerInstanceList", {});
  }

  async createLoadBalancer(params: {
    loadBalancerName: string;
    loadBalancerAlgorithmTypeCode: string;
    loadBalancerRuleList?: string;
    vpcNo?: string;
    subnetNoList?: string;
  }) {
    return await this.request("GET", "/vloadbalancer/v2", "/createLoadBalancerInstance", params);
  }

  async deleteLoadBalancer(loadBalancerInstanceNo: string) {
    return await this.request("GET", "/vloadbalancer/v2", "/deleteLoadBalancerInstances", {
      "loadBalancerInstanceNoList.1": loadBalancerInstanceNo
    });
  }

  async addLoadBalancerTarget(params: {
    loadBalancerInstanceNo: string;
    serverInstanceNoList: string[];
  }) {
    const formattedParams: any = {
      loadBalancerInstanceNo: params.loadBalancerInstanceNo
    };
    params.serverInstanceNoList.forEach((no, index) => {
      formattedParams[`serverInstanceNoList.${index + 1}`] = no;
    });
    return await this.request("GET", "/vloadbalancer/v2", "/changeLoadBalancedServerInstances", formattedParams);
  }

  // ===== Cloud DB APIs =====
  async listCloudDBInstances() {
    return await this.request("GET", "/clouddb/v2", "/getCloudDBInstanceList", {});
  }

  async createCloudDB(params: {
    cloudDBServiceName: string;
    cloudDBServerNamePrefix: string;
    cloudDBServerCount: string;
    cloudDBProductCode: string;
    cloudDBImageProductCode: string;
    dataStorageTypeCode: string;
    vpcNo?: string;
    subnetNo?: string;
  }) {
    return await this.request("GET", "/clouddb/v2", "/createCloudDBInstance", params);
  }

  async deleteCloudDB(cloudDBInstanceNo: string) {
    return await this.request("GET", "/clouddb/v2", "/deleteCloudDBInstance", {
      cloudDBInstanceNo
    });
  }
}

// MCP 서버 설정
const server = new Server(
  {
    name: "ncp-compute-server",
    version: "2.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const accessKey = process.env.NCP_ACCESS_KEY;
const secretKey = process.env.NCP_SECRET_KEY;

if (!accessKey || !secretKey) {
  console.error("Error: NCP_ACCESS_KEY and NCP_SECRET_KEY must be set");
  process.exit(1);
}

const ncpClient = new NCPClient(accessKey, secretKey);

// 도구 목록 정의
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Server 관련
      {
        name: "list_servers",
        description: "NCP의 모든 서버 인스턴스 목록을 조회합니다",
        inputSchema: {
          type: "object",
          properties: {
            regionCode: { type: "string", description: "리전 코드 (예: KR, JP)" },
          },
        },
      },
      {
        name: "get_server_detail",
        description: "특정 서버 인스턴스의 상세 정보를 조회합니다",
        inputSchema: {
          type: "object",
          properties: {
            serverInstanceNo: { type: "string", description: "서버 인스턴스 번호" },
          },
          required: ["serverInstanceNo"],
        },
      },
      {
        name: "create_server",
        description: "새로운 서버 인스턴스를 생성합니다",
        inputSchema: {
          type: "object",
          properties: {
            serverName: { type: "string", description: "서버 이름" },
            serverImageProductCode: { type: "string", description: "서버 이미지 상품 코드" },
            serverProductCode: { type: "string", description: "서버 상품 코드" },
            vpcNo: { type: "string", description: "VPC 번호" },
            subnetNo: { type: "string", description: "서브넷 번호" },
            loginKeyName: { type: "string", description: "로그인 키 이름" },
            serverCreateCount: { type: "string", description: "생성할 서버 개수 (기본값: 1)" },
          },
          required: ["serverName", "serverImageProductCode", "serverProductCode"],
        },
      },
      {
        name: "delete_server",
        description: "서버 인스턴스를 삭제합니다",
        inputSchema: {
          type: "object",
          properties: {
            serverInstanceNo: { type: "string", description: "삭제할 서버 인스턴스 번호" },
          },
          required: ["serverInstanceNo"],
        },
      },
      {
        name: "stop_server",
        description: "실행 중인 서버 인스턴스를 중지합니다",
        inputSchema: {
          type: "object",
          properties: {
            serverInstanceNo: { type: "string", description: "중지할 서버 인스턴스 번호" },
          },
          required: ["serverInstanceNo"],
        },
      },
      {
        name: "start_server",
        description: "중지된 서버 인스턴스를 시작합니다",
        inputSchema: {
          type: "object",
          properties: {
            serverInstanceNo: { type: "string", description: "시작할 서버 인스턴스 번호" },
          },
          required: ["serverInstanceNo"],
        },
      },
      
      // VPC 관련
      {
        name: "list_vpcs",
        description: "VPC 목록을 조회합니다",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "create_vpc",
        description: "새로운 VPC를 생성합니다",
        inputSchema: {
          type: "object",
          properties: {
            vpcName: { type: "string", description: "VPC 이름" },
            ipv4CidrBlock: { type: "string", description: "IPv4 CIDR 블록 (예: 10.0.0.0/16)" },
          },
          required: ["vpcName", "ipv4CidrBlock"],
        },
      },
      {
        name: "delete_vpc",
        description: "VPC를 삭제합니다",
        inputSchema: {
          type: "object",
          properties: {
            vpcNo: { type: "string", description: "VPC 번호" },
          },
          required: ["vpcNo"],
        },
      },
      
      // Subnet 관련
      {
        name: "list_subnets",
        description: "서브넷 목록을 조회합니다",
        inputSchema: {
          type: "object",
          properties: {
            vpcNo: { type: "string", description: "VPC 번호 (선택사항)" },
          },
        },
      },
      {
        name: "create_subnet",
        description: "새로운 서브넷을 생성합니다",
        inputSchema: {
          type: "object",
          properties: {
            subnetName: { type: "string", description: "서브넷 이름" },
            vpcNo: { type: "string", description: "VPC 번호" },
            subnet: { type: "string", description: "서브넷 CIDR (예: 10.0.1.0/24)" },
            zoneCode: { type: "string", description: "존 코드 (예: KR-1)" },
            networkAclNo: { type: "string", description: "Network ACL 번호" },
            subnetTypeCode: { type: "string", description: "서브넷 타입 코드 (PUBLIC/PRIVATE)" },
          },
          required: ["subnetName", "vpcNo", "subnet", "zoneCode", "networkAclNo", "subnetTypeCode"],
        },
      },
      {
        name: "delete_subnet",
        description: "서브넷을 삭제합니다",
        inputSchema: {
          type: "object",
          properties: {
            subnetNo: { type: "string", description: "서브넷 번호" },
          },
          required: ["subnetNo"],
        },
      },
      
      // ACG 관련
      {
        name: "list_acgs",
        description: "ACG(Access Control Group) 목록을 조회합니다",
        inputSchema: {
          type: "object",
          properties: {
            vpcNo: { type: "string", description: "VPC 번호 (선택사항)" },
          },
        },
      },
      {
        name: "create_acg",
        description: "새로운 ACG를 생성합니다",
        inputSchema: {
          type: "object",
          properties: {
            accessControlGroupName: { type: "string", description: "ACG 이름" },
            vpcNo: { type: "string", description: "VPC 번호" },
            accessControlGroupDescription: { type: "string", description: "ACG 설명" },
          },
          required: ["accessControlGroupName", "vpcNo"],
        },
      },
      {
        name: "delete_acg",
        description: "ACG를 삭제합니다",
        inputSchema: {
          type: "object",
          properties: {
            accessControlGroupNo: { type: "string", description: "ACG 번호" },
          },
          required: ["accessControlGroupNo"],
        },
      },
      {
        name: "add_acg_rule",
        description: "ACG에 인바운드 규칙을 추가합니다",
        inputSchema: {
          type: "object",
          properties: {
            accessControlGroupNo: { type: "string", description: "ACG 번호" },
            protocolTypeCode: { type: "string", description: "프로토콜 타입 (TCP/UDP/ICMP)" },
            ipBlock: { type: "string", description: "IP 블록 (예: 0.0.0.0/0)" },
            portRange: { type: "string", description: "포트 범위 (예: 80, 1-65535)" },
          },
          required: ["accessControlGroupNo", "protocolTypeCode"],
        },
      },
      
      // Load Balancer 관련
      {
        name: "list_load_balancers",
        description: "로드 밸런서 목록을 조회합니다",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "create_load_balancer",
        description: "새로운 로드 밸런서를 생성합니다",
        inputSchema: {
          type: "object",
          properties: {
            loadBalancerName: { type: "string", description: "로드 밸런서 이름" },
            loadBalancerAlgorithmTypeCode: { type: "string", description: "알고리즘 타입 (RR/LC/SIPHS)" },
            vpcNo: { type: "string", description: "VPC 번호" },
            subnetNoList: { type: "string", description: "서브넷 번호 리스트" },
          },
          required: ["loadBalancerName", "loadBalancerAlgorithmTypeCode"],
        },
      },
      {
        name: "delete_load_balancer",
        description: "로드 밸런서를 삭제합니다",
        inputSchema: {
          type: "object",
          properties: {
            loadBalancerInstanceNo: { type: "string", description: "로드 밸런서 인스턴스 번호" },
          },
          required: ["loadBalancerInstanceNo"],
        },
      },
      {
        name: "add_load_balancer_target",
        description: "로드 밸런서에 타겟 서버를 추가합니다",
        inputSchema: {
          type: "object",
          properties: {
            loadBalancerInstanceNo: { type: "string", description: "로드 밸런서 인스턴스 번호" },
            serverInstanceNoList: { type: "array", items: { type: "string" }, description: "서버 인스턴스 번호 리스트" },
          },
          required: ["loadBalancerInstanceNo", "serverInstanceNoList"],
        },
      },
      
      // Cloud DB 관련
      {
        name: "list_cloud_dbs",
        description: "Cloud DB 인스턴스 목록을 조회합니다",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "create_cloud_db",
        description: "새로운 Cloud DB 인스턴스를 생성합니다",
        inputSchema: {
          type: "object",
          properties: {
            cloudDBServiceName: { type: "string", description: "Cloud DB 서비스 이름" },
            cloudDBServerNamePrefix: { type: "string", description: "서버 이름 접두사" },
            cloudDBServerCount: { type: "string", description: "서버 개수" },
            cloudDBProductCode: { type: "string", description: "상품 코드" },
            cloudDBImageProductCode: { type: "string", description: "이미지 상품 코드" },
            dataStorageTypeCode: { type: "string", description: "스토리지 타입 코드" },
            vpcNo: { type: "string", description: "VPC 번호" },
            subnetNo: { type: "string", description: "서브넷 번호" },
          },
          required: ["cloudDBServiceName", "cloudDBServerNamePrefix", "cloudDBServerCount", "cloudDBProductCode", "cloudDBImageProductCode", "dataStorageTypeCode"],
        },
      },
      {
        name: "delete_cloud_db",
        description: "Cloud DB 인스턴스를 삭제합니다",
        inputSchema: {
          type: "object",
          properties: {
            cloudDBInstanceNo: { type: "string", description: "Cloud DB 인스턴스 번호" },
          },
          required: ["cloudDBInstanceNo"],
        },
      },
    ],
  };
});

// 도구 실행 핸들러
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    if (!args) {
      throw new Error("Arguments are required");
    }

    let result;
    
    switch (name) {
      // Server APIs
      case "list_servers": {
        const typedArgs = args as { regionCode?: string };
        result = await ncpClient.listServers(typedArgs.regionCode);
        break;
      }
      case "get_server_detail": {
        const typedArgs = args as { serverInstanceNo: string };
        result = await ncpClient.getServerDetail(typedArgs.serverInstanceNo);
        break;
      }
      case "create_server": {
        const typedArgs = args as {
          serverName: string;
          serverImageProductCode: string;
          serverProductCode: string;
          vpcNo?: string;
          subnetNo?: string;
          loginKeyName?: string;
          serverCreateCount?: string;
        };
        result = await ncpClient.createServer(typedArgs);
        break;
      }
      case "delete_server": {
        const typedArgs = args as { serverInstanceNo: string };
        result = await ncpClient.deleteServer(typedArgs.serverInstanceNo);
        break;
      }
      case "stop_server": {
        const typedArgs = args as { serverInstanceNo: string };
        result = await ncpClient.stopServer(typedArgs.serverInstanceNo);
        break;
      }
      case "start_server": {
        const typedArgs = args as { serverInstanceNo: string };
        result = await ncpClient.startServer(typedArgs.serverInstanceNo);
        break;
      }
        
      // VPC APIs
      case "list_vpcs": {
        result = await ncpClient.listVpcs();
        break;
      }
      case "create_vpc": {
        const typedArgs = args as {
          vpcName: string;
          ipv4CidrBlock: string;
        };
        result = await ncpClient.createVpc(typedArgs);
        break;
      }
      case "delete_vpc": {
        const typedArgs = args as { vpcNo: string };
        result = await ncpClient.deleteVpc(typedArgs.vpcNo);
        break;
      }
        
      // Subnet APIs
      case "list_subnets": {
        const typedArgs = args as { vpcNo?: string };
        result = await ncpClient.listSubnets(typedArgs.vpcNo);
        break;
      }
      case "create_subnet": {
        const typedArgs = args as {
          subnetName: string;
          vpcNo: string;
          subnet: string;
          zoneCode: string;
          networkAclNo: string;
          subnetTypeCode: string;
        };
        result = await ncpClient.createSubnet(typedArgs);
        break;
      }
      case "delete_subnet": {
        const typedArgs = args as { subnetNo: string };
        result = await ncpClient.deleteSubnet(typedArgs.subnetNo);
        break;
      }
        
      // ACG APIs
      case "list_acgs": {
        const typedArgs = args as { vpcNo?: string };
        result = await ncpClient.listAcgs(typedArgs.vpcNo);
        break;
      }
      case "create_acg": {
        const typedArgs = args as {
          accessControlGroupName: string;
          vpcNo: string;
          accessControlGroupDescription?: string;
        };
        result = await ncpClient.createAcg(typedArgs);
        break;
      }
      case "delete_acg": {
        const typedArgs = args as { accessControlGroupNo: string };
        result = await ncpClient.deleteAcg(typedArgs.accessControlGroupNo);
        break;
      }
      case "add_acg_rule": {
        const typedArgs = args as {
          accessControlGroupNo: string;
          protocolTypeCode: string;
          ipBlock?: string;
          portRange?: string;
          accessControlGroupSequence?: string;
        };
        result = await ncpClient.addAcgRule(typedArgs);
        break;
      }
        
      // Load Balancer APIs
      case "list_load_balancers": {
        result = await ncpClient.listLoadBalancers();
        break;
      }
      case "create_load_balancer": {
        const typedArgs = args as {
          loadBalancerName: string;
          loadBalancerAlgorithmTypeCode: string;
          loadBalancerRuleList?: string;
          vpcNo?: string;
          subnetNoList?: string;
        };
        result = await ncpClient.createLoadBalancer(typedArgs);
        break;
      }
      case "delete_load_balancer": {
        const typedArgs = args as { loadBalancerInstanceNo: string };
        result = await ncpClient.deleteLoadBalancer(typedArgs.loadBalancerInstanceNo);
        break;
      }
      case "add_load_balancer_target": {
        const typedArgs = args as {
          loadBalancerInstanceNo: string;
          serverInstanceNoList: string[];
        };
        result = await ncpClient.addLoadBalancerTarget(typedArgs);
        break;
      }
        
      // Cloud DB APIs
      case "list_cloud_dbs": {
        result = await ncpClient.listCloudDBInstances();
        break;
      }
      case "create_cloud_db": {
        const typedArgs = args as {
          cloudDBServiceName: string;
          cloudDBServerNamePrefix: string;
          cloudDBServerCount: string;
          cloudDBProductCode: string;
          cloudDBImageProductCode: string;
          dataStorageTypeCode: string;
          vpcNo?: string;
          subnetNo?: string;
        };
        result = await ncpClient.createCloudDB(typedArgs);
        break;
      }
      case "delete_cloud_db": {
        const typedArgs = args as { cloudDBInstanceNo: string };
        result = await ncpClient.deleteCloudDB(typedArgs.cloudDBInstanceNo);
        break;
      }
        
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// 서버 시작
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("NCP Extended MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
