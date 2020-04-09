const edgeSDK = require('wisepaas-datahub-edge-nodejs-sdk');

const options = {
  connectType: edgeSDK.constant.connectType.DCCS,
  DCCS: {
    credentialKey: 'adcekc0f74837e3lqtdlkgfazn4i6qv8',
    APIUrl: 'https://api-dccs-ensaas.sa.wise-paas.com/'
  },
  // MQTT: {
  //   hostName: '127.0.0.1',
  //   port: 1883,
  //   username: 'admin',
  //   password: 'admin',
  //   protocolType: edgeSDK.constant.protocol.TCP
  // },
  useSecure: false,
  autoReconnect: true,
  reconnectInterval: 1000,
  nodeId: '6579dba6-9d19-44a2-b645-c2319c8f1315', // getting from datahub portal
  type: edgeSDK.constant.edgeType.Gateway, // Choice your edge is Gateway or Device, Default is Gateway
  deviceId: 'Device1', // If type is Device, DeviceId must be filled
  heartbeat: 60000, // default is 60 seconds,
  dataRecover: true, // need to recover data or not when disconnected
  ovpnPath: '' // set the path of your .ovpn file, only for linux
};
const deviceCount = 1;
const analogTagNum = 3;
const discreteTagNum = 3;
const textTagNum = 3;
const arrayTagNum = 3;
let sendTimer = {};

const edgeAgent = new edgeSDK.EdgeAgent(options);

edgeAgent.connect();

edgeAgent.events.on('connected', () => {
  console.log('Connect success !');
  const edgeConfig = configPrepare();
  edgeAgent.uploadConfig(edgeSDK.constant.actionType.create, edgeConfig).then((res) => {
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
    case edgeSDK.constant.messageType.WriteValue:
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
    case edgeSDK.constant.messageType.ConfigAck:
      console.log('Upload Config Result: ' + msg.message);
      break;
  }
});

function configPrepare () {
  const edgeConfig = new edgeSDK.EdgeConfig();
  const analogTagList = [];
  const discreteTagList = [];
  const textTagList = [];

  for (let i = 1; i <= deviceCount; i++) {
    const deviceConfig = new edgeSDK.DeviceConfig();
    deviceConfig.id = 'Device' + i;
    deviceConfig.name = 'Device ' + i;
    deviceConfig.type = 'Smart Device';
    deviceConfig.description = 'Device ' + i;
    for (let j = 1; j <= analogTagNum; j++) {
      const analogTagConfig = new edgeSDK.AnalogTagConfig();
      analogTagConfig.name = 'ATag' + j;
      analogTagConfig.description = 'ATag' + j;
      analogTagList.push(analogTagConfig);
    }
    for (let j = 1; j <= discreteTagNum; j++) {
      const discreteTagConfig = new edgeSDK.DiscreteTagConfig();
      discreteTagConfig.name = 'DTag' + j;
      discreteTagConfig.description = 'DTag' + j;
      discreteTagList.push(discreteTagConfig);
    }
    for (let j = 1; j <= textTagNum; j++) {
      const textTagConfig = new edgeSDK.TextTagConfig();
      textTagConfig.name = 'TTag' + j;
      textTagConfig.description = 'TTag' + j;
      textTagList.push(textTagConfig);
    }
    for (let j = 1; j <= arrayTagNum; j++) {
      const arrayTag = new edgeSDK.EdgeAgent.AnalogTagConfig();
      arrayTag.name = 'ArrayTag' + j;
      arrayTag.description = 'ArrayTag' + j;
      arrayTag.arraySize = 10;
      analogTagList.push(arrayTag);
    }
    deviceConfig.analogTagList = analogTagList;
    deviceConfig.discreteTagList = discreteTagList;
    deviceConfig.textTagList = textTagList;

    edgeConfig.node.deviceList.push(deviceConfig);
  }

  return edgeConfig;
}
function sendData (edgeConfig) {
  if (Object.keys(edgeConfig).length === 0) {
    return;
  }
  const data = prepareData(edgeConfig.node.deviceList.length, analogTagNum, discreteTagNum, textTagNum, arrayTagNum);
  edgeAgent.sendData(data);
}
function prepareData (numDeviceCount, numATagCount, numDTagCount, numTTagCount, numAryTagCount) {
  const data = new edgeSDK.EdgeData();
  for (let i = 1; i <= numDeviceCount; i++) {
    for (let j = 1; j <= numATagCount; j++) {
      const ATag = new edgeSDK.EdgeDataTag();
      ATag.deviceId = 'Device' + i;
      ATag.tagName = 'ATag' + j;
      ATag.value = Math.floor(Math.random() * 100) + 1;
      data.tagList.push(ATag);
    }
    for (let j = 1; j <= numDTagCount; j++) {
      const DTag = new edgeSDK.EdgeDataTag();
      DTag.deviceId = 'Device' + i;
      DTag.tagName = 'DTag' + j;
      DTag.value = j % 2;
      data.tagList.push(DTag);
    }
    for (let j = 1; j <= numTTagCount; j++) {
      const TTag = new edgeSDK.EdgeDataTag();
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
      const AryTag = new edgeSDK.EdgeDataTag();
      AryTag.deviceId = 'Device' + i;
      AryTag.tagName = 'ArrayTag' + j;
      AryTag.value = dic;
      data.tagList.push(AryTag);
    }
  }

  return data;
}
function updateDeviceStatus (numDeviceCount) {
  const devieStatus = new edgeSDK.EdgeDeviceStatus();
  for (let i = 1; i <= numDeviceCount; i++) {
    const device = new edgeSDK.DeviceStatus();
    device.id = 'Device' + i;
    device.status = 1;
    devieStatus.deviceList.push(device);
  }
  edgeAgent.sendDeviceStatus(devieStatus);
}
