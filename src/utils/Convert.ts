class Convert {
  static convertTime = (time: number) => {
    if (Number.isNaN(time) || Number.isFinite(time)) {
      return "-";
    } else {
      const hour = Math.floor(time / 3600);
      const min = Math.floor((time - 3600 * hour) / 60);
      const second = time - 3600 * hour - 60 * min;
      if (hour !== 0) {
        return hour + ":" + ("0" + min).substr(-2) + ":" + ("0" + second).substr(-2);
      } else {
        return ("0" + min).substr(-2) + ":" + ("0" + second).substr(-2);
      }
    }
  };

  static convertDuration = (duration: number) => {
    if (Number.isNaN(duration)) {
      return "-";
    } else if (Number.isFinite(duration)) {
      if (duration > 0) {
        return "∞";
      } else {
        return "-∞";
      }
    } else if (duration > 1000) {
      return duration / 1000;
    } else {
      return duration;
    }
  };

  static convertDurationUnit = (duration: number) => {
    if (Number.isNaN(duration) || Number.isFinite(duration)) {
      return "";
    } else if (duration > 1000) {
      return "s";
    } else {
      return "ms";
    }
  };

  static convertBitrate = (bitrate: number) => {
    if (Number.isNaN(bitrate) || Number.isFinite(bitrate)) {
      return "-";
    } else if (bitrate > 1024 * 1024 * 1024) {
      return bitrate / (1024 * 1024 * 1024);
    } else if (bitrate > 1024 * 1024) {
      return bitrate / (1024 * 1024);
    } else if (bitrate > 1024) {
      return bitrate / 1024;
    } else {
      return bitrate;
    }
  };

  static convertBitrateUnit = (bitrate: number) => {
    if (Number.isNaN(bitrate) || Number.isFinite(bitrate)) {
      return "";
    } else if (bitrate > 1024 * 1024 * 1024) {
      return "GB/s";
    } else if (bitrate > 1024 * 1024) {
      return "MB/s";
    } else if (bitrate > 1024) {
      return "kB/s";
    } else {
      return "B/s";
    }
  };
}

export default Convert;
