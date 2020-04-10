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
const arrayTagSize = 10;

let sendTimer = {};
let edgeConfig = {};

let edgeAgent = new edgeSDK.EdgeAgent(options);
edgeAgent.connect();

edgeAgent.events.on('connected', () => {
  console.log('Connect success !');
  edgeConfig = prepareConfig();
  edgeAgent.uploadConfig(edgeSDK.constant.actionType.create, edgeConfig).then((res) => {
    // when mqtt disconnect happened, and automatically reconnect
    // clear interval to prevent duplicate time interval call
    clearInterval(sendTimer);
    sendTimer = setInterval(sendData, 1000);
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
      for (let device of msg.message.deviceList) {
        console.log('DeviceId: ' + device.id);
        for (let tag of device.tagList) {
          console.log('TagName: ' + tag.name + ', Value: ' + tag.value);
        }
      }
      break;
    case edgeSDK.constant.messageType.ConfigAck:
      console.log('Upload Config Result: ' + msg.message);
      break;
  }
});

function prepareConfig () {
  let edgeConfig = new edgeSDK.EdgeConfig();
  let analogTagList = [];
  let discreteTagList = [];
  let textTagList = [];

  for (let i = 1; i <= deviceCount; i++) {
    let deviceConfig = new edgeSDK.DeviceConfig();
    deviceConfig.id = 'Device' + i;
    deviceConfig.name = 'Device ' + i;
    deviceConfig.type = 'Smart Device';
    deviceConfig.description = 'Device ' + i;
    for (let j = 1; j <= analogTagNum; j++) {
      let analogTagConfig = new edgeSDK.AnalogTagConfig();
      analogTagConfig.name = 'ATag' + j;
      analogTagConfig.description = 'ATag' + j;
      analogTagList.push(analogTagConfig);
    }
    for (let j = 1; j <= discreteTagNum; j++) {
      let discreteTagConfig = new edgeSDK.DiscreteTagConfig();
      discreteTagConfig.name = 'DTag' + j;
      discreteTagConfig.description = 'DTag' + j;
      discreteTagList.push(discreteTagConfig);
    }
    for (let j = 1; j <= textTagNum; j++) {
      let textTagConfig = new edgeSDK.TextTagConfig();
      textTagConfig.name = 'TTag' + j;
      textTagConfig.description = 'TTag' + j;
      textTagList.push(textTagConfig);
    }
    for (let j = 1; j <= arrayTagNum; j++) {
      let arrayTag = new edgeSDK.AnalogTagConfig();
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
function sendData () {
  if (Object.keys(edgeConfig).length === 0) {
    return;
  }
  let data = prepareData();
  edgeAgent.sendData(data);
}
function prepareData () {
  let data = new edgeSDK.EdgeData();
  for (let i = 1; i <= deviceCount; i++) {
    for (let j = 1; j <= analogTagNum; j++) {
      let ATag = new edgeSDK.EdgeDataTag();
      ATag.deviceId = 'Device' + i;
      ATag.tagName = 'ATag' + j;
      ATag.value = Math.floor(Math.random() * 100) + 1;
      data.tagList.push(ATag);
    }
    for (let j = 1; j <= discreteTagNum; j++) {
      let DTag = new edgeSDK.EdgeDataTag();
      DTag.deviceId = 'Device' + i;
      DTag.tagName = 'DTag' + j;
      DTag.value = j % 2;
      data.tagList.push(DTag);
    }
    for (let j = 1; j <= textTagNum; j++) {
      let TTag = new edgeSDK.EdgeDataTag();
      TTag.deviceId = 'Device' + i;
      TTag.tagName = 'TTag' + j;
      TTag.value = 'TEST' + j.toString();
      data.tagList.push(TTag);
    }
    for (let j = 1; j <= arrayTagNum; j++) {
      let dic = {};
      for (let k = 0; k < arrayTagSize; k++) {
        dic[k.toString()] = Math.floor(Math.random() * 100) + 1;
      }
      let AryTag = new edgeSDK.EdgeDataTag();
      AryTag.deviceId = 'Device' + i;
      AryTag.tagName = 'ArrayTag' + j;
      AryTag.value = dic;
      data.tagList.push(AryTag);
    }
  }

  return data;
}
function updateDeviceStatus (numDeviceCount) {
  let devieStatus = new edgeSDK.EdgeDeviceStatus();
  for (let i = 1; i <= numDeviceCount; i++) {
    let device = new edgeSDK.DeviceStatus();
    device.id = 'Device' + i;
    device.status = 1;
    devieStatus.deviceList.push(device);
  }
  edgeAgent.sendDeviceStatus(devieStatus);
}
