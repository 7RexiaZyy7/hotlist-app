#!/usr/bin/env python3
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse
import json
import sys
import os

# 把项目根目录加入路径，方便导入
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from maimai_crawler import search_maimai

class MaimaiAPIHandler(BaseHTTPRequestHandler):
    def _set_headers(self, status_code=200):
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_OPTIONS(self):
        self._set_headers()
    
    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        query_params = urllib.parse.parse_qs(parsed_path.query)
        
        if parsed_path.path == '/api/maimai/search':
            keyword = query_params.get('keyword', ['AI 焦虑'])[0]
            
            try:
                results = search_maimai(keyword)
                self._set_headers()
                self.wfile.write(json.dumps({
                    'success': True,
                    'data': results
                }, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self._set_headers(500)
                self.wfile.write(json.dumps({
                    'success': False,
                    'error': str(e)
                }, ensure_ascii=False).encode('utf-8'))
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({
                'success': False,
                'error': 'Not found'
            }, ensure_ascii=False).encode('utf-8'))

def run(server_class=HTTPServer, handler_class=MaimaiAPIHandler, port=8765):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f'Starting Maimai API server on port {port}...')
    print(f'API endpoint: http://localhost:{port}/api/maimai/search?keyword=AI 焦虑')
    print('Press Ctrl+C to stop the server')
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nStopping server...')
        httpd.server_close()

if __name__ == '__main__':
    port = 8765
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    run(port=port)
