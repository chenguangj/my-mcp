import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { z } from 'zod';

interface WeatherResponse {
	location: string;
	temperature: number;
	description: string;
	humidity: number;
	windSpeed: number;
	icon: string;
}

export class WeatherMCP extends McpAgent {
	server = new McpServer({
		name: 'Weather MCP Server',
		version: '1.0.0',
	});

	async init() {
		// 查询天气工具
		this.server.registerTool(
			'get_weather',
			{
				description: '查询指定城市的天气信息，包括温度、湿度、风速等',
				inputSchema: {
					city: z.string().describe('城市名称（中文或英文），例如：Beijing, Shanghai, Tokyo, London'),
				},
			},
			async ({ city }) => {
				try {
					const weatherUrl = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
					const response = await fetch(weatherUrl);

					if (!response.ok) {
						return {
							content: [{ type: 'text' as const, text: '无法获取天气信息，请检查城市名称是否正确' }],
							isError: true,
						};
					}

					const data: any = await response.json();
					const current = data.current_condition[0];
					const location = data.nearest_area[0];

					const weatherData: WeatherResponse = {
						location: `${location.areaName[0].value}, ${location.country[0].value}`,
						temperature: parseInt(current.temp_C),
						description: current.weatherDesc[0].value,
						humidity: parseInt(current.humidity),
						windSpeed: parseInt(current.windspeedKmph),
						icon: current.weatherIconUrl[0].value,
					};

					// 记录访问日志到D1数据库
					try {
						await this.env.DB.prepare(
							'INSERT INTO weather_logs (city, location, temperature, description, ip_address) VALUES (?, ?, ?, ?, ?)',
						)
							.bind(city, weatherData.location, weatherData.temperature, weatherData.description, 'mcp-client')
							.run();
					} catch (dbError) {
						console.error('数据库记录失败:', dbError);
					}

					const text = [
						`📍 位置: ${weatherData.location}`,
						`🌡️ 温度: ${weatherData.temperature}°C`,
						`☁️ 天气: ${weatherData.description}`,
						`💧 湿度: ${weatherData.humidity}%`,
						`💨 风速: ${weatherData.windSpeed} km/h`,
					].join('\n');

					return { content: [{ type: 'text' as const, text }] };
				} catch (error) {
					return {
						content: [{ type: 'text' as const, text: `查询失败: ${(error as Error).message}` }],
						isError: true,
					};
				}
			},
		);

		// 查询访问日志工具
		this.server.registerTool(
			'get_weather_logs',
			{
				description: '获取天气查询的访问日志记录',
				inputSchema: {
					limit: z.number().min(1).max(100).default(50).describe('返回的记录数量，默认50条，最大100条'),
				},
			},
			async ({ limit }) => {
				try {
					const result = await this.env.DB.prepare('SELECT * FROM weather_logs ORDER BY query_time DESC LIMIT ?').bind(limit).all();

					if (!result.results || result.results.length === 0) {
						return { content: [{ type: 'text' as const, text: '暂无访问日志记录' }] };
					}

					const logsText = result.results
						.map((log: any) => `[${log.query_time}] ${log.city} - ${log.location} - ${log.temperature}°C - ${log.description}`)
						.join('\n');

					return {
						content: [{ type: 'text' as const, text: `共 ${result.results.length} 条访问记录:\n\n${logsText}` }],
					};
				} catch (error) {
					return {
						content: [{ type: 'text' as const, text: `查询日志失败: ${(error as Error).message}` }],
						isError: true,
					};
				}
			},
		);

		// 查询城市访问统计工具
		this.server.registerTool(
			'get_weather_stats',
			{
				description: '获取城市天气查询的统计信息，显示哪些城市被查询最多',
				inputSchema: {},
			},
			async () => {
				try {
					const result = await this.env.DB.prepare(
						'SELECT city, COUNT(*) as count FROM weather_logs GROUP BY city ORDER BY count DESC LIMIT 20',
					).all();

					if (!result.results || result.results.length === 0) {
						return { content: [{ type: 'text' as const, text: '暂无统计数据' }] };
					}

					const statsText = result.results.map((stat: any, index: number) => `${index + 1}. ${stat.city}: ${stat.count} 次查询`).join('\n');

					return {
						content: [{ type: 'text' as const, text: `城市查询统计 (Top ${result.results.length}):\n\n${statsText}` }],
					};
				} catch (error) {
					return {
						content: [{ type: 'text' as const, text: `查询统计失败: ${(error as Error).message}` }],
						isError: true,
					};
				}
			},
		);
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext): Response | Promise<Response> {
		const url = new URL(request.url);

		// MCP 端点
		if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
			return WeatherMCP.serve('/mcp').fetch(request, env, ctx);
		}

		// 根路径返回说明信息
		if (url.pathname === '/') {
			return new Response(
				JSON.stringify({
					name: 'Weather MCP Server',
					version: '1.0.0',
					description: '天气查询 MCP 服务器，部署在 Cloudflare Workers 上',
					mcp_endpoint: '/mcp',
					tools: ['get_weather', 'get_weather_logs', 'get_weather_stats'],
					usage: '使用任何支持远程 MCP 的客户端连接到 /mcp 端点即可使用',
				}),
				{
					headers: { 'Content-Type': 'application/json; charset=utf-8' },
				},
			);
		}

		return new Response('Not Found', { status: 404 });
	},
};
