import axios from 'axios'

// Spring Boot 的基址（由 Nginx/网关转发到 Spring，再由 Spring 代理到 Flask）
// 若 Spring 就部署在同域，可用 '/'，否则改为 'http://<spring-host>:<port>'
const baseURL = 'http://localhost:8089/'

const client = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' }
})

// 可选：统一错误拦截
client.interceptors.response.use(
  res => res,
  err => {
    const msg = err?.response?.data?.message || err.message || '请求失败'
    console.error('API Error:', msg)
    return Promise.reject(err)
  }
)

export default client
