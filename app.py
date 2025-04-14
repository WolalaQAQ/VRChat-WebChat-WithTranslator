from flask import Flask, render_template, request, send_from_directory, jsonify
from pythonosc import udp_client
import toml  # 替换json为toml
import os
import requests
import logging
import sys
import webbrowser
import threading
import time
import json  # 保留json用于API请求

# 配置日志
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 添加这个函数来获取正确的资源路径
def resource_path(relative_path):
    """ 获取正确的资源路径，适用于开发环境和打包环境 """
    if getattr(sys, 'frozen', False):
        # 运行在打包环境
        base_path = os.path.dirname(sys.executable)
    else:
        # 运行在开发环境
        base_path = os.path.dirname(os.path.abspath(__file__))
    
    return os.path.join(base_path, relative_path)

def load_config(file_path):
    """加载TOML配置文件"""
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            config = toml.load(f)
            return config
    else:
        error_msg = f"Config file {file_path} not found."
        logger.error(error_msg)
        raise FileNotFoundError(error_msg)

def translate_text(text, config, target_language):
    """使用大语言模型翻译文本"""
    api_key = config["api"]["key"]
    prompt = config["prompt"]["template"]
    
    # 使用前端传入的target_language
    prompt = prompt.replace("{target_language}", target_language)
    
    headers = {
        "Authorization": 'Bearer ' + api_key,
    }

    params = {
        "messages": [{
            "role": 'user',
            "content": f"{prompt}\n{text}"
        }],
        "model": config["api"]["model"],
    }
    
    try:
        logger.info(f"发送翻译请求: {text} 到 {target_language}")
        response = requests.post(
            f"{config['api']['url']}/v1/chat/completions",
            headers=headers,
            json=params,
            stream=False,
            timeout=60  # 添加超时
        )
        
        # 检查HTTP状态码
        response.raise_for_status()
        
        # 检查响应内容是否为空
        if not response.text:
            raise ValueError("Empty response received from API")
        
        # 尝试解析JSON
        try:
            res = response.json()
        except json.JSONDecodeError as e:
            logger.error(f"JSON解析错误: {e}")
            logger.error(f"响应内容: {response.text}")
            raise ValueError(f"API 返回了无效的 JSON: {str(e)}")
        
        # 检查响应格式是否正确
        if 'choices' not in res or not res['choices'] or 'message' not in res['choices'][0]:
            logger.error(f"API 响应格式不正确: {res}")
            raise ValueError(f"API 响应格式不正确")
        
        res_content = res['choices'][0]['message']['content']
        logger.info(f"翻译结果: {res_content}")
        return res_content
        
    except requests.exceptions.RequestException as e:
        logger.error(f"API 请求错误: {e}")
        raise ValueError(f"API 请求失败: {str(e)}")
    except Exception as e:
        logger.error(f"翻译过程中发生错误: {e}")
        raise ValueError(f"翻译失败: {str(e)}")

# Flask应用主体
app = Flask(__name__, 
            static_folder=resource_path('static'),
            template_folder=resource_path('templates'))

# 全局OSC客户端
client = None

@app.route('/', methods=['GET', 'POST'])
def home():
    """主路由处理GET和POST请求"""
    global client
    
    if request.method == 'POST':
        # 处理消息发送请求
        if 'message' in request.form:
            message = request.form['message']
            typing = int(request.form['typing'])
            
            try:
                client.send_message("/chatbox/input", [message, True, True])
                client.send_message("/chatbox/typing", typing)
                logger.info(f"消息已发送: {message}")
                return "Message sent"
            except Exception as e:
                logger.error(f"发送消息出错: {e}")
                return f"Error sending message: {str(e)}", 500
        
        # 处理打字状态请求
        elif 'typing' in request.form and 'message' not in request.form:
            typing = int(request.form['typing'])
            
            try:
                client.send_message("/chatbox/typing", typing)
                logger.info(f"打字状态已更新: {typing}")
                return "Typing status updated"
            except Exception as e:
                logger.error(f"更新打字状态出错: {e}")
                return f"Error updating typing status: {str(e)}", 500
        
        # 处理翻译请求
        elif 'translate' in request.form:
            text = request.form['translate']
            target_language = request.form.get('target_language', 'English')
            
            try:
                logger.info(f"接收到翻译请求: {text} 到 {target_language}")
                translated_text = translate_text(text, config, target_language)
                return translated_text
            except Exception as e:
                error_message = f"翻译失败: {str(e)}"
                logger.error(error_message)
                return error_message, 500
    
    # GET请求返回主页面
    return render_template('index.html')

# 静态文件路由
@app.route('/static/js/<path:filename>')
def serve_js(filename):
    """提供JavaScript文件"""
    return send_from_directory(os.path.join(app.static_folder, 'js'), filename)

@app.route('/static/css/<path:filename>')
def serve_css(filename):
    """提供CSS文件"""
    return send_from_directory(os.path.join(app.static_folder, 'css'), filename)

@app.route('/static/lang/<path:filename>')
def serve_lang(filename):
    """提供语言文件"""
    return send_from_directory(os.path.join(app.static_folder, 'lang'), filename)

def open_browser():
    """在短暂延迟后打开浏览器，确保Flask服务器已经启动"""
    time.sleep(1.5)  # 给服务器启动一点时间
    url = f'http://127.0.0.1:{config["web"]["port"]}'
    logger.info(f"正在打开浏览器: {url}")
    webbrowser.open(url)

if __name__ == '__main__':
    # 加载配置文件
    try:
        config = load_config(resource_path('config.toml'))  # 修改配置文件名为config.toml
        logger.info("配置文件加载成功")
    except Exception as e:
        logger.critical(f"加载配置文件失败: {e}")
        exit(1)
    
    # OSC服务器配置
    oscip = config["osc"]["ip"]
    oscport = config["osc"]["port"]
    
    # WEB服务器配置
    webip = config["web"]["ip"]
    webport = config["web"]["port"]
    
    # 初始化OSC客户端
    try:
        client = udp_client.SimpleUDPClient(oscip, oscport)
        logger.info(f"OSC客户端已初始化，连接到 {oscip}:{oscport}")
    except Exception as e:
        logger.critical(f"初始化OSC客户端失败: {e}")
        exit(1)

    # 在单独的线程中打开浏览器，这样不会阻塞Flask服务器启动
    if config["app"]["open_browser"]:  # 可以在配置中控制是否自动打开浏览器
        threading.Thread(target=open_browser).start()
    
    # 启动Flask应用
    logger.info(f"启动Web服务器，监听 {webip}:{webport}")
    app.run(debug=config["app"]["debug"], host=webip, port=webport)
