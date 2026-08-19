import axios from 'axios';

// withCredentials sends the login cookie with every request, so the server
// knows which user is making the call.
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

export default api;

// Pull a readable error message out of a failed API call, or use a fallback.
export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  return err?.response?.data?.message || fallback;
}
