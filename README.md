# VRChat-WebChat-WithTranslator

[English](README.md) | [简体中文](README_zh-CN.md)

A tool for more conveniently sending chat messages to VRChat from your browser, with an optional translation feature. **Supports almost any device that can open a browser!**

## Running the packaged version

### Configure API (if using translation feature)

Modify the `api_url` and `api_key` in [config.toml](config.toml). The API needs to support OpenAI format, example:

```toml
[api]
url = "https://api.openai.com"
key = "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### Start

Find the `VRChat_WebChat.exe` file in the `build` directory and double-click to run

You should see the following prompt:

```shell
* Running on all addresses (0.0.0.0)
* Running on http://127.0.0.1:5000
* Running on http://198.18.0.1:5000
```

The default browser will automatically open to the `127.0.0.1:5000` page, and you can now use it normally.

You can also access from other devices on the same network using `http://<your_ip>:5000` (such as `http://198.18.0.1:5000` in the example above). Note that if you are using it on a local network, make sure your firewall allows access to port 5000.

## Running the source code

### Install Dependencies

```shell
pip install -r requirements.txt
```

### Start

```shell
python app.py
```

## Packaging

### Dependencies

This project uses `cx_freeze` for packaging.

### Create Package

```shell
python setup.py build
```

## Acknowledgments

This project is modified from [a2942/VRChat-OSC-WEB-Chat](https://github.com/a2942/VRChat-OSC-WEB-Chat) with added translation feature. Thanks to the original author for their contribution.

## License

This project uses the GPL-3.0 license. For details, please check the [LICENSE](LICENSE) file.
