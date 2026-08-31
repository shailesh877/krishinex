const rawConfig = `{\\"type\\":\\"service_account\\",\\"project_id\\":\\"krishinexnotificationsystem\\",\\"private_key_id\\":\\"62755f9d0f2cb5b27cb9acde3675f10aabf0d964\\",\\"private_key\\":\\"-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCgI29xcdB/OodX\\nWckyK3N1gnL+vjsEmcQ8wUnyTdEVq7szr9LHWOOEMy6VpI9+/f+jeRppEnXoGH/f\\nMvhJB9rVieYlCFpmWc4He/oXrPiz78tVz+1/tNLPf6KTrhwLJi4+/znPxsv2zsMe\\nXvCyWqRQWIj3V+Cvbpwic2bLyUA4fiZWja5Uh1ElosqiuEiBrpV9cIY+XLdKjbLi\\nyFI2SBJxZ6Uh8PvoEvufcKJxebaZmVH7Wt/vGHP6jDECryte1exPrJxhk+2dRPtt\\n4+hcqwPO/8kCcvhpcUvIk3+CEQLQK6wZ4uiyZx0ielnUJXkIGibJ4mMubQ8L175k\\nghO4ppUHAgMBAAECggEAAhRxNs9TAsil5j91Gb5eXCF713JfvgPYF2Vjl9+NcQkq\nTVk2EbGkkPDA67CUcAJorZmR+1JgZozol9YiqVhfHRtc5hc7f6g7hGhDJoRA/2eY\\ntllRjPSrnP+fWpfvweKuZ6m9hqn54COqb/yEeTSK9nmM84mpC3u6yavdPgFViUZH\nOMzm6P7Xg2LQBNpE2uF1RcCu9Pw7yNxIAFbC/IKv9S/s5ilz6dK1rrGWmvgDkWns\nK0EA32FDaAC5vAp1iEfzz0kP92YCw123XVvorEMBWrYMUNsXgsPMmfEyWfDrq9lM\nojZ+DOOYG5LUGjR0BLDXP618871Z6dF8HkzxGfpyqQKBgQDLq6k1WfFV/9rH9Mny\nc2ZoIaRzyypJNmSuAkXJRP24zTrO4pmM/s9F2TuB0fUmjQyJ0RNr9xTdT3aqRRDN\nljI3TGQUclI80nF0lmkO6VS9fecZ6fpnCAzXBvWX++NSP8xw1eGJZCKhAhcvOz88\npPshYIZbpeoSnxRVkd3qkntHjwKBgQDJSHfL1jKT/ZBX8SSRf1gED0yfVfVTo6Qs\nXeDZ6CsAdPvDhNBGiN3KjDLaYQsJpeQ+61BFf05cAwQZGxB1QfXLYycSOTvlW+aE\nDo4Qhl+kc7ySpcJ/1k9E6SfrUDq9JXo1wNxnISJZkW+aU5b3dmdzXVA4pYHAuJOv\n7e/Kh41fCQKBgQCW/Q63L5ObZs8Bl7ay19xebDpnYYFav0lKOwMTX+McwoDLaO/e\nt/RfWtkjt8wfJUfbT7UvQAAmxUc6mXMIhkV5+1biVZIj5vsXLH58AHzC8fiGnI/3\nG9+w9UbSwnjWu9dK+zR1T1fgtxUK/cg2pDRMnStd/BUYcvh3K2kyAiAEfwKBgQDJ\nClqs+2pVKiPr0m1F7b1JgMZ1NvPr8DxgG/wjaaLZt/5m0Nb+PGHalqGMQPU3U7xf\no8TvRTJM8K49LS0JETKhTI2PxB6w/VOGfssicjRBG2Az0OAtsy5Fk+NNQzsIBNDF\ns7XwQ8X9VCf2KptU26yEK6WejqDEjxbj13F0BmQLkQKBgFKZneHd9/C3H5/aKinG\nSOF+uiAlxpwHFNWfABmBdBE/V0mtuI3BU27EUirn60+m3DhOsMR1A+2LbVwMvTNW\nIS0XMyX3ey4DKYnc6ld3zBJUhFDpc2YNak67+47SYLhoWWh6vHZ47PbY47wG3AsA\n8Dof9kQjU0rzULFTXPJEMtqt\\n-----END PRIVATE KEY-----\\n\\\",\\\"client_email\\":\\"firebase-adminsdk-fbsvc@krishinexnotificationsystem.iam.gserviceaccount.com\\",\\\"client_id\\":\\"116121527297721737447\\",\\\"auth_uri\\":\\"https://accounts.google.com/o/oauth2/auth\\",\\\"token_uri\\":\\"https://oauth2.googleapis.com/token\\",\\\"auth_provider_x509_cert_url\\":\\"https://www.googleapis.com/oauth2/v1/certs\\",\\\"client_x509_cert_url\\":\\"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40krishinexnotificationsystem.iam.gserviceaccount.com\\",\\\"universe_domain\\":\\"googleapis.com\\"}`;

console.log("Original String Length:", rawConfig.length);

// 1. Unescape double quotes
let cleanConfig = rawConfig.replace(/\\"/g, '"');

console.log("Unescaped String Preview:", cleanConfig.substring(0, 200));

try {
    const parsed = JSON.parse(cleanConfig);
    console.log("✅ PARSING SUCCESSFUL!");
    console.log("Project ID:", parsed.project_id);
    console.log("Private Key ID:", parsed.private_key_id);
    console.log("Private Key Preview:", parsed.private_key.substring(0, 100));
} catch (err) {
    console.error("❌ PARSING FAILED:", err.message);
}
