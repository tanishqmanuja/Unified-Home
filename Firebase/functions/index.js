// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require("firebase-functions");

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require("firebase-admin");
admin.initializeApp();

// SmartHome API from Actions on Google
const { smarthome } = require("actions-on-google");

//Firebase Database
const firebaseRef = admin.database().ref("/");

//*---------------------------------SmartHome Functions
const app = smarthome({
  debug: true,
  key: "<api-key>"
});

//*-----On Sync
app.onSync(body => {
  return {
    requestId: body.requestId,
    payload: {
      agentUserId: "123",
      devices: [
        {
          id: "Socket",
          type: "action.devices.types.SWITCH",
          traits: ["action.devices.traits.OnOff"],
          name: {
            defaultNames: ["Socket"],
            name: "Socket",
            nicknames: ["Socket", "Smart Socket"]
          },
          willReportState: false,
          deviceInfo: {
            manufacturer: "Stark Industries",
            model: "UH-Socket",
            hwVersion: "1.0",
            swVersion: "1.0"
          }
        }
      ]
    }
  };
});

//*-----On Query
app.onQuery(async body => {
  const { requestId } = body;
  const payload = {
    devices: {}
  };
  const queryPromises = [];
  for (const input of body.inputs) {
    for (const device of input.payload.devices) {
      const deviceId = device.id;
      queryPromises.push(
        // eslint-disable-next-line promise/always-return
        queryDevice(deviceId).then(data => {
          payload.devices[deviceId] = data;
        })
      );
    }
  }
  // Wait for all promises to resolve
  await Promise.all(queryPromises);
  return {
    requestId: requestId,
    payload: payload
  };
});

//*-----On Execute
app.onExecute(body => {
  const { requestId } = body;
  const payload = {
    commands: [
      {
        ids: [],
        status: "SUCCESS",
        states: {
          online: true
        }
      }
    ]
  };
  for (const input of body.inputs) {
    for (const command of input.payload.commands) {
      for (const device of command.devices) {
        const deviceId = device.id;
        payload.commands[0].ids.push(deviceId);
        for (const execution of command.execution) {
          const execCommand = execution.command;
          const { params } = execution;
          switch (execCommand) {
            case "action.devices.commands.OnOff":
              firebaseRef.child(`${deviceId}`).update({
                OnOff: params.on
              });
              payload.commands[0].states.on = params.on;
              break;
          }
        }
      }
    }
  }
  return {
    requestId: requestId,
    payload: payload
  };
});

exports.smarthome = functions.https.onRequest(app);

//Used Functions

const queryFirebase = async deviceId => {
  const snapshot = await firebaseRef.child(deviceId).once("value");
  const snapshotVal = snapshot.val();
  return {
    on: snapshotVal.OnOff
  };
};

const queryDevice = async deviceId => {
  const data = await queryFirebase(deviceId);
  return {
    online: true,
    on: data.on
  };
};

//*---------------------------------Fake Auth & Token

//Util for Formatting HTTP Body
const util = require("util");

exports.fakeauth = functions.https.onRequest((request, response) => {
  const responseurl = util.format(
    "%s?code=%s&state=%s",
    decodeURIComponent(request.query.redirect_uri),
    "xxxxxx",
    request.query.state
  );
  console.log(responseurl);
  return response.redirect(responseurl);
});

exports.faketoken = functions.https.onRequest((request, response) => {
  const grantType = request.query.grant_type
    ? request.query.grant_type
    : request.body.grant_type;
  const secondsInDay = 86400; // 60 * 60 * 24
  const HTTP_STATUS_OK = 200;
  console.log(`Grant type ${grantType}`);

  let obj;
  if (grantType === "authorization_code") {
    obj = {
      token_type: "bearer",
      access_token: "123access",
      refresh_token: "123refresh",
      expires_in: secondsInDay
    };
  } else if (grantType === "refresh_token") {
    obj = {
      token_type: "bearer",
      access_token: "123access",
      expires_in: secondsInDay
    };
  }
  response.status(HTTP_STATUS_OK).json(obj);
});

//*---------------------------------Database Management

exports.manageReadings = functions.database
  .ref("Socket-Stats/iPower_temp")
  .onCreate(snap => {
    const val = snap.val();
    snap.ref.remove();

    let tPowerRef = admin.database().ref("Socket-Stats/tPower");
    tPowerRef.once("value",snapshot=>{
      tPowerRef.set(snapshot.val() + val*(30/3600));
    });

    return admin
      .database()
      .ref("Socket-Stats/iPower")
      .push({
        value: val,
        timestamp: admin.database.ServerValue.TIMESTAMP
      });
  });

// const MAX_LOG_COUNT_iPower = 5;

// exports.remove_iPower = functions.database
//   .ref("Socket/Stats/iPower/{pushId}/")
//   .onCreate(snapshot => {
//     const parentRef = snapshot.ref.parent;
//     // eslint-disable-next-line consistent-return
//     return parentRef.once("value").then(snapshot => {
//       // eslint-disable-next-line promise/always-return
//       if (snapshot.numChildren() >= MAX_LOG_COUNT_iPower) {
//         let childCount = 0;
//         const updates = {};
//         snapshot.forEach(child => {
//           if (++childCount <= snapshot.numChildren() - MAX_LOG_COUNT_iPower) {
//             updates[child.key] = null;
//           }
//         });
//         return parentRef.update(updates);
//       }
//     });
//   });
