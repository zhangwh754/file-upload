import React, { useEffect, useRef, useState } from "react";
import { Button, Progress, message } from "antd";
import { SlideDown } from "react-slidedown";
import UploadLogic from "./UploadLogic";
import "./style.css";
import "react-slidedown/lib/slidedown.css";

const Upload = () => {
  const inputRef = useRef(null);
  const [uploadPercent, setUploadPercent] = useState(0); // 1. 使用状态来存储上传进度

  useEffect(() => {
    const changeFile = ({ target }) => {
      const file = target.files[0];

      responseChange(file);
    };

    const inputDom = inputRef.current;

    inputDom.addEventListener("change", changeFile);

    return () => {
      inputDom.removeEventListener("change", changeFile);
    };
  }, []);

  const responseChange = async (file) => {
    setUploadPercent(0);

    const upload = new UploadLogic();

    // 1.校验文件，获取md5
    const fileMd5Value = await upload.md5File(file);

    // 2.校验文件的md5
    const { data } = await upload.checkFileMD5(file.name, fileMd5Value);

    // 如果文件已存在, 就秒传
    if (data?.file) {
      message.success("文件秒传成功");
      setUploadPercent(100);
      return;
    }

    // 3：检查并上传切片
    await upload.checkAndUploadChunk(
      file,
      fileMd5Value,
      data.chunkList,
      setUploadPercent
    );

    // // 4：通知服务器所有服务器分片已经上传完成
    await upload.notifyServer(file, fileMd5Value, () => {
      message.success("上传成功");
      setUploadPercent(100);
    });
  };

  return (
    <div className="wrap">
      <div className="upload">
        <span>点击上传文件：</span>
        <input ref={inputRef} type="file" id="file" />
        <Button type="primary" onClick={() => inputRef.current.click()}>
          上传
        </Button>
      </div>

      {uploadPercent > 0 && (
        <SlideDown className={"my-dropdown-slidedown"}>
          <div className="uploading">
            上传文件进度：
            <Progress type="circle" percent={uploadPercent} />
          </div>
        </SlideDown>
      )}
    </div>
  );
};

export default Upload;
