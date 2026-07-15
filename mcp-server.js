#!/usr/bin/env node

/**
 * MCP Weather Server
 * 提供天气查询、访问日志和统计功能的MCP服务器
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// 从环境变量获取Worker URL，如果没有则使用默认值
const WORKER_URL = process.env.WORKER_URL || 'https://mcp-weather.zhenchenjing.workers.dev';

class WeatherMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'weather-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();

    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    // 列出可用的工具
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_weather',
          description: '查询指定城市的天气信息，包括温度、湿度、风速等',
          inputSchema: {
            type: 'object',
            properties: {
              city: {
                type: 'string',
                description: '城市名称（中文或英文），例如：Beijing, Shanghai, Tokyo, London',
              },
            },
            required: ['city'],
          },
        },
        {
          name: 'get_weather_logs',
          description: '获取天气查询的访问日志记录',
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: '返回的记录数量，默认50条，最大100条',
                default: 50,
              },
            },
          },
        },
        {
          name: 'get_weather_stats',
          description: '获取城市天气查询的统计信息，显示哪些城市被查询最多',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }));

    // 处理工具调用
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_weather':
            return await this.getWeather(args.city);

          case 'get_weather_logs':
            return await this.getWeatherLogs(args.limit || 50);

          case 'get_weather_stats':
            return await this.getWeatherStats();

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async getWeather(city) {
    const response = await fetch(`${WORKER_URL}/weather?city=${encodeURIComponent(city)}`);
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    return {
      content: [
        {
          type: 'text',
          text: `📍 ${data.location}\n🌡️ 温度: ${data.temperature}°C\n☁️ 天气: ${data.description}\n💧 湿度: ${data.humidity}%\n💨 风速: ${data.windSpeed} km/h`,
        },
      ],
    };
  }

  async getWeatherLogs(limit) {
    const response = await fetch(`${WORKER_URL}/logs?limit=${limit}`);
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    const logsText = data.logs
      .map(
        (log) =>
          `[${log.query_time}] ${log.city} - ${log.location} - ${log.temperature}°C - ${log.description}`
      )
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `共 ${data.total} 条访问记录:\n\n${logsText}`,
        },
      ],
    };
  }

  async getWeatherStats() {
    const response = await fetch(`${WORKER_URL}/stats`);
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    const statsText = data.stats
      .map((stat, index) => `${index + 1}. ${stat.city}: ${stat.count} 次查询`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `城市查询统计 (Top ${data.stats.length}):\n\n${statsText}`,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Weather MCP server running on stdio');
    console.error('Worker URL:', WORKER_URL);
  }
}

const server = new WeatherMCPServer();
server.run().catch(console.error);
