export interface Metrics{requests:number;errors:number;requestDurationMs:number;startedAt:number;}
export function createMetrics():Metrics{return{requests:0,errors:0,requestDurationMs:0,startedAt:Date.now()};}
export function metricsText(m:Metrics):string{const uptime=(Date.now()-m.startedAt)/1000;const avg=m.requests?m.requestDurationMs/m.requests:0;return [
"# HELP ai_commerce_requests_total Total HTTP requests.",
"# TYPE ai_commerce_requests_total counter",
`ai_commerce_requests_total ${m.requests}`,
"# HELP ai_commerce_errors_total Total HTTP 5xx responses.",
"# TYPE ai_commerce_errors_total counter",
`ai_commerce_errors_total ${m.errors}`,
"# HELP ai_commerce_request_duration_ms_total Sum of HTTP request durations in milliseconds.",
"# TYPE ai_commerce_request_duration_ms_total counter",
`ai_commerce_request_duration_ms_total ${m.requestDurationMs.toFixed(2)}`,
"# HELP ai_commerce_request_duration_ms_avg Average HTTP request duration in milliseconds.",
"# TYPE ai_commerce_request_duration_ms_avg gauge",
`ai_commerce_request_duration_ms_avg ${avg.toFixed(2)}`,
"# HELP ai_commerce_uptime_seconds Process uptime in seconds.",
"# TYPE ai_commerce_uptime_seconds gauge",
`ai_commerce_uptime_seconds ${uptime.toFixed(2)}`,
].join("\n")+"\n";}