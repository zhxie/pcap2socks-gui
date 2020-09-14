class Convert {
  static convertTime = (time: number) => {
    if (Number.isNaN(time) || !Number.isFinite(time)) {
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
    } else if (!Number.isFinite(duration)) {
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
    if (Number.isNaN(duration) || !Number.isFinite(duration)) {
      return "";
    } else if (duration > 1000) {
      return "s";
    } else {
      return "ms";
    }
  };

  static convertRate = (bitrate: number) => {
    if (Number.isNaN(bitrate) || !Number.isFinite(bitrate)) {
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
    if (Number.isNaN(bitrate) || !Number.isFinite(bitrate)) {
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

  static convertPacketRateUnit = (rate: number) => {
    if (Number.isNaN(rate) || !Number.isFinite(rate)) {
      return "";
    } else if (rate > 1024 * 1024 * 1024) {
      return "Gp/s";
    } else if (rate > 1024 * 1024) {
      return "Mp/s";
    } else if (rate > 1024) {
      return "kp/s";
    } else {
      return "p/s";
    }
  };

  static convertThroughput = (size: number) => {
    if (Number.isNaN(size) || !Number.isFinite(size)) {
      return "-";
    } else if (size > 1024 * 1024 * 1024) {
      return size / (1024 * 1024 * 1024);
    } else if (size > 1024 * 1024) {
      return size / (1024 * 1024);
    } else if (size > 1024) {
      return size / 1024;
    } else {
      return size;
    }
  };

  static convertBitThroughputUnit = (size: number) => {
    if (Number.isNaN(size) || !Number.isFinite(size)) {
      return "";
    } else if (size > 1024 * 1024 * 1024) {
      return "GB";
    } else if (size > 1024 * 1024) {
      return "MB";
    } else if (size > 1024) {
      return "kB";
    } else {
      return "B";
    }
  };

  static convertPacketThroughputUnit = (size: number) => {
    if (Number.isNaN(size) || !Number.isFinite(size)) {
      return "";
    } else if (size > 1024 * 1024 * 1024) {
      return "Gp";
    } else if (size > 1024 * 1024) {
      return "Mp";
    } else if (size > 1024) {
      return "kp";
    } else {
      return "p";
    }
  };
}

export default Convert;
