const config = require("../config/config");

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

    const defaultDir = utils.path.join(info.pluginDir,"./change-tts/resource/default.yml");
    const configDir = utils.path.join(info.pluginDir, "./change-tts/config.yml");
    this.#config = new config("change-tts", this.logger, utils.fs, defaultDir, configDir);
    this.getConfig = this.#config.getConfig;

    if(TREM.variable.speech) this.changeVoice(TREM.variable.speech)

    const winstonLogger = logger._getLogger();

    winstonLogger.transports.forEach(transport => {
      const originalLog = transport.log.bind(transport);
      transport.log = (info, callback) => {

        if (info.message == "Speech ready!") {
          this.changeVoice(TREM.variable.speech)
        }
        return originalLog(info, callback);
      };
    });
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
      if (selectedVoice) speech.setVoice(selectedVoice);
      logger.info(`Change voice to --> ${selectedVoice}`);
    }
  }
}

module.exports = Plugin;