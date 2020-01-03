const edgeSDK = require('wisepaas-scada-edge-nodejs-sdk');
const options = {
  connectType: 1, // MQTT=0 DCCS=1
  DCCS: {
    credentialKey: '9bd96d1062cafe3eeb9295ff5301dak2',
    APIUrl: 'https://api-dccs.wise-paas.com/'
  },
  // MQTT: {
  //   hostName: 'PC031206',
  //   port: 1883,
  //   username: 'admin',
  //   password: 'admin',
  //   protocolType: 0
  // },
  useSecure: false,
  autoReconnect: true,
  reconnectInterval: 1000,
  scadaId: 'ca05f6ca-4e1c-4b10-b72b-f6aec8a46efb', // getting from SCADA portal
  type: 0, // Choice your edge is Gateway or Device, Default is Gateway
  deviceId: 'Device1', // If type is Device, DeviceId must be filled
  heartbeat: 60000, // default is 60 seconds,
  dataRecover: true // need to recover data or not when disconnected
};
const MessageType =
{
  WriteValue: 0,
  WriteConfig: 1,
  TimeSync: 2,
  ConfigAck: 3
};
const deviceCount = 1;
const analogTagNum = 3;
const discreteTagNum = 3;
const textTagNum = 3;
const arrayTagNum = 3;
let sendTimer = {};

const edgeAgent = new edgeSDK.EdgeAgent(options);

edgeAgent.connect();
// setTimeout(edgeAgent.disconnect.bind(edgeAgent), 5000);
// setTimeout(edgeAgent.connect.bind(edgeAgent), 10000);

edgeAgent.events.on('connected', () => {
  console.log('Connect success !');
  const edgeConfig = configPrepare();
  const actionType = 1;// create=1
  edgeAgent.uploadConfig(actionType, edgeConfig).then((res) => {
    // when mqtt disconnect happened, and automatically reconnect
    // clear interval to prevent duplicate time interval call
    clearInterval(sendTimer);
    sendTimer = setInterval(sendData.bind(null, edgeConfig), 1000);
  }, error => {
    console.log('upload config error');
    console.log(error);
  });
});
edgeAgent.events.on('disconnected', () => {
  console.log('Disconnected... ');
});
edgeAgent.events.on('messageReceived', (msg) => {
  switch (msg.type) {
    case MessageType.WriteValue:
      for (const device of msg.message.deviceList) {
        console.log('DeviceId: ' + device.id);
        for (const tag of device.tagList) {
          if (typeof tag.value === 'object') {
            for (const aryTag in tag.value) {
              console.log('TagName: ' + tag.name + ', Index: ' + aryTag + ', Value: ' + tag.value[aryTag]);
            }
          } else {
            console.log('TagName: ' + tag.name + ', Value: ' + tag.value);
          }
        }
      }
      break;
    case MessageType.ConfigAck:
      console.log('Upload Config Result: ' + msg.message);
      break;
  }
});

function configPrepare () {
  const edgeConfig = new edgeSDK.EdgeAgent.EdgeConfig();
  const analogTagList = [];
  const discreteTagList = [];
  const textTagList = [];

  for (let i = 1; i <= deviceCount; i++) {
    const deviceConfig = new edgeSDK.EdgeAgent.DeviceConfig();
    deviceConfig.id = 'Device' + i;
    deviceConfig.name = 'Device ' + i;
    deviceConfig.type = 'Smart Device';
    deviceConfig.description = 'Device ' + i;
    for (let j = 1; j <= analogTagNum; j++) {
      const analogTagConfig = new edgeSDK.EdgeAgent.AnalogTagConfig();
      analogTagConfig.name += j;
      analogTagConfig.description += j;
      analogTagList.push(analogTagConfig);
    }
    for (let j = 1; j <= discreteTagNum; j++) {
      const discreteTagConfig = new edgeSDK.EdgeAgent.DiscreteTagConfig();
      discreteTagConfig.name = 'DTag' + j;
      discreteTagConfig.description += j;
      discreteTagList.push(discreteTagConfig);
    }
    for (let j = 1; j <= textTagNum; j++) {
      const textTagConfig = new edgeSDK.EdgeAgent.TextTagConfig();
      textTagConfig.name = 'TTag' + j;
      textTagConfig.description += j;
      textTagList.push(textTagConfig);
    }
    for (let j = 1; j <= arrayTagNum; j++) {
      const arrayTag = new edgeSDK.EdgeAgent.AnalogTagConfig();
      arrayTag.name = 'ArrayTag' + j;
      arrayTag.description += j;
      arrayTag.arraySize = 10;
      analogTagList.push(arrayTag);
    }
    deviceConfig.analogTagList = analogTagList;
    deviceConfig.discreteTagList = discreteTagList;
    deviceConfig.textTagList = textTagList;

    edgeConfig.scada.deviceList.push(deviceConfig);
  }

  return edgeConfig;
}
function sendData (edgeConfig) {
  if (Object.keys(edgeConfig).length === 0) return;
  const data = prepareData(edgeConfig.scada.deviceList.length, analogTagNum, discreteTagNum, textTagNum, arrayTagNum);
  edgeAgent.sendData(data);
}
function prepareData (numDeviceCount, numATagCount, numDTagCount, numTTagCount, numAryTagCount) {
  const data = new edgeSDK.EdgeAgent.EdgeData();
  for (let i = 1; i <= numDeviceCount; i++) {
    for (let j = 1; j <= numATagCount; j++) {
      const ATag = new edgeSDK.EdgeAgent.Tag();
      ATag.deviceId = 'Device' + i;
      ATag.tagName = 'ATag' + j;
      ATag.value = Math.floor(Math.random() * 100) + 1;
      data.tagList.push(ATag);
    }
    for (let j = 1; j <= numDTagCount; j++) {
      const DTag = new edgeSDK.EdgeAgent.Tag();
      DTag.deviceId = 'Device' + i;
      DTag.tagName = 'DTag' + j;
      DTag.value = j % 2;
      data.tagList.push(DTag);
    }
    for (let j = 1; j <= numTTagCount; j++) {
      const TTag = new edgeSDK.EdgeAgent.Tag();
      TTag.deviceId = 'Device' + i;
      TTag.tagName = 'TTag' + j;
      TTag.value = 'TEST' + j.toString();
      data.tagList.push(TTag);
    }
    for (let j = 1; j <= numAryTagCount; j++) {
      const dic = {};
      for (let k = 0; k < 10; k++) {
        dic[k.toString()] = Math.floor(Math.random() * 100) + 1;
      }
      const AryTag = new edgeSDK.EdgeAgent.Tag();
      AryTag.deviceId = 'Device' + i;
      AryTag.tagName = 'ArrayTag' + j;
      AryTag.value = dic;
      data.tagList.push(AryTag);
    }
  }

  return data;
}
function updateDeviceStatus (numDeviceCount) {
  const devieStatus = new edgeSDK.EdgeAgent.EdgeDeviceStatus();
  for (let i = 1; i <= numDeviceCount; i++) {
    const device = new edgeSDK.EdgeAgent.DeviceStatus();
    device.id = 'Device' + i;
    device.status = 1;
    devieStatus.deviceList.push(device);
  }
  edgeAgent.sendDeviceStatus(devieStatus);
}
