const config = require("../config/config");
const {ipcRenderer} = require("electron");
const enabledPlugins = localStorage.getItem('enabled-plugins')

class Plugin {
  static instance = null;

  #ctx;
  #config

  constructor(ctx) {
    if (Plugin.instance) return Plugin.instance;

    this.#ctx = ctx;
    this.#config = null;
    this.logger = null;
    this.getConfig = ()=> void 0;

    Plugin.instance = this;
  }

  static getInstance() {
    if (!Plugin.instance) throw new Error("Plugin not initialized");
    return Plugin.instance;
  }

  onLoad() {
    const { TREM, logger , info , utils} = this.#ctx;
    JSON.parse(enabledPlugins).forEach((item)=>{
      if(item == 'disable-tts'){
        ipcRenderer.send("open-plugin-window", {
          pluginId: "change-tts",
          htmlPath: `${info.pluginDir}/change-tts/web/warring.html`,
          options: {
            width          : 630,
            height         : 140,
            frame          : true,
            resizable      : false,
            maximized      : true,
            alwaysOnTop    : true,
            webPreferences : {
              nodeIntegration  : true,
              contextIsolation : false
            },
            title: "warning",
          },
        });
      }
    })

    const defaultDir = utils.path.join(info.pluginDir,"./change-tts/resource/default.yml");
    const configDir = utils.path.join(info.pluginDir, "./change-tts/config.yml");
    this.#config = new config("change-tts", this.logger, utils.fs, defaultDir, configDir);
    this.getConfig = this.#config.getConfig;

    if(TREM.variable.speech) this.changeVoice(TREM.variable.speech)

    // 獲取 Pino 實例
    const pinoLogger = logger._getLogger();

    /**
     * PINO 修改部分：
     * Pino 不像 Winston 有 transports 陣列可以遍歷。
     * 我們需要攔截觸發 "Speech ready!" 的日誌方法（通常是 info）。
     */

    // 1. 綁定原始的 info 方法以保留上下文
    const originalInfo = pinoLogger.info.bind(pinoLogger);

    // 2. 覆寫 info 方法
    pinoLogger.info = (...args) => {
      // Pino 的參數形式通常是: (msg), (obj, msg), 或 (obj)
      // 我們需要檢查參數中是否包含目標訊息
      let isTargetMessage = false;

      // 檢查第一個參數是字串的情況: logger.info("Speech ready!")
      if (typeof args[0] === 'string' && args[0] === "Speech ready!") {
        isTargetMessage = true;
      }
      // 檢查第二個參數是字串的情況: logger.info({context}, "Speech ready!")
      else if (typeof args[1] === 'string' && args[1] === "Speech ready!") {
        isTargetMessage = true;
      }
      // 檢查物件中包含 msg 屬性的情況: logger.info({ msg: "Speech ready!" })
      else if (args[0] && typeof args[0] === 'object' && args[0].msg === "Speech ready!") {
        isTargetMessage = true;
      }

      // 如果檢測到目標訊息
      if (isTargetMessage) {
        this.changeVoice(TREM.variable.speech);
      }

      // 3. 執行原始的日誌記錄，確保日誌仍被輸出
      return originalInfo(...args);
    };
  }

  changeVoice(speech) {
    const voiceList = [
      'Microsoft Hanhan - Chinese (Traditional, Taiwan)',
      'Microsoft Yating - Chinese (Traditional, Taiwan)',
      'Microsoft Zhiwei - Chinese (Traditional, Taiwan)'
    ];
    if (speech) {
      const ttsConfig = this.#config.getConfig();
      const selectedVoice = voiceList[ttsConfig.tts];
      if (ttsConfig.speed) speech.setRate(ttsConfig.speed);
      if (selectedVoice) speech.setVoice(selectedVoice);
      logger.info(`\nChange TTS Speed To --> ${ttsConfig.speed}\nChange TTS Voice To --> ${selectedVoice}`);
    }
  }
}

module.exports = Plugin;