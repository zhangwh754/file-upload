import axios from "axios";
import SparkMD5 from "spark-md5";

const BaseUrl = "http://localhost:1111";

export default class UploadLogic {
  constructor(chunkSize) {
    this.chunkSize = chunkSize || 3000 * 1024; // 3000kb一切片
    this.chunks = 0;
  }

  // 实现文件转换成md5并进行切片的逻辑
  async md5File(file) {
    return new Promise((resolve, reject) => {
      // 文件截取
      const blobSlice =
        File.prototype.slice ||
        File.prototype.mozSlice ||
        File.prototype.webkitSlice;
      const spark = new SparkMD5.ArrayBuffer();
      const fileReader = new FileReader();

      this.chunks =
        file.size > this.chunkSize ? Math.ceil(file.size / this.chunkSize) : 1; // 总分片数量

      fileReader.onload = (e) => {
        spark.append(e.target.result);
        this.checkCurrentChunk += 1;

        if (this.checkCurrentChunk < this.chunks) {
          loadNext();
        } else {
          let result = spark.end();
          resolve(result);
        }
      };

      fileReader.onerror = function () {
        console.error("文件读取错误");
      };

      const loadNext = () => {
        const start = this.checkCurrentChunk * this.chunkSize;
        const end =
          start + this.chunkSize >= file.size
            ? file.size
            : start + this.chunkSize;

        // 文件切片
        fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));

        this.checkCurrentChunk += 1;
      };

      loadNext();
    });
  }

  // 实现校验文件的md5的逻辑
  async checkFileMD5(fileName, fileMd5Value) {
    let url =
      BaseUrl +
      "/check/file?fileName=" +
      fileName +
      "&fileMd5Value=" +
      fileMd5Value;
    return axios.get(url);
  }

  // 实现上传chunk的逻辑
  async uploadChunk({ i, file, fileMd5Value, callback }) {
    let end =
      (i + 1) * this.chunkSize >= file.size
        ? file.size
        : (i + 1) * this.chunkSize;

    const formData = new FormData();

    formData.append("data", file.slice(i * this.chunkSize, end));
    formData.append("total", this.chunks);
    formData.append("index", i);
    formData.append("fileMd5Value", fileMd5Value);

    return axios
      .post(BaseUrl + "/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then(({ data }) => {
        if (data.stat) {
          const uploadPercent = ((i / this.chunks) * 100).toFixed(2);

          typeof callback === "function" && callback(uploadPercent);
        }
      });
  }

  // 实现检查并上传chunk的逻辑
  async checkAndUploadChunk(file, fileMd5Value, chunkList, callback) {
    const uploadPromise = [];

    for (let i = 0; i < this.chunks; i++) {
      const isExist = chunkList.indexOf(`${i}`) !== -1;

      // 该切片尚未上传到服务器
      if (!isExist) {
        uploadPromise.push(
          this.uploadChunk({ i, file, fileMd5Value, callback })
        );
      }
    }

    if (uploadPromise.length) {
      await Promise.all(uploadPromise);
    }
  }

  // 实现通知服务器所有服务器分片已经上传完成的逻辑
  async notifyServer(file, fileMd5Value, callback) {
    let url =
      BaseUrl +
      "/merge?md5=" +
      fileMd5Value +
      "&fileName=" +
      file.name +
      "&size=" +
      file.size;
    return axios.get(url).then(({ data }) => {
      if (data.stat) {
        if (typeof callback === "function") callback();
      } else {
        console.log("上传失败");
      }
    });
  }
}
