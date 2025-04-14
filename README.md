# VRChat-WebChat-WithTranslator

用于更方便的在浏览器对VRChat游戏发送聊天内容，并附带翻译功能（可选），**支持几乎任何可以打开浏览器的设备！**

## 运行

### 安装依赖

```shell
pip install -r requirements.txt
```

### 配置API(如果使用翻译功能)

修改[config.toml](config.toml)中的`api_url`和`api_key`,API需支持OpenAI格式,示例如下:

```toml
[api]
url = "https://api.openai.com"
key = "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### 启动

```shell
python app.py
```

此时应该弹出以下提示:

```shell
* Running on all addresses (0.0.0.0)
* Running on http://127.0.0.1:5000
* Running on http://198.18.0.1:5000
```

并自动使用默认浏览器打开了`127.0.0.1:5000`页面,此时就可以正常使用了

你也可以在同一内网的其他设备上使用`http://<your_ip>:5000`访问(如上面示例中的`http://198.18.0.1:5000`),需要注意的是,如果你在局域网中使用,请确保你的防火墙允许访问5000端口

## 打包

### 依赖

本项目使用`cx_freeze`打包,可以使用以下命令安装:

```shell
pip install cx_Freeze
```

### 进行打包

```shell
python setup.py build
```

## 鸣谢

本项目在[a2942/VRChat-OSC-WEB-Chat](https://github.com/a2942/VRChat-OSC-WEB-Chat)的基础上进行了修改,并添加了翻译功能,感谢原作者的贡献

## License

本项目使用GPL-3.0许可证,详情请查看[LICENSE](LICENSE)文件
