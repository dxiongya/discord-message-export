const axios = require("axios");
const delay = require("delay")
const {unionBy} = require("lodash/array");
const xlsx = require('node-xlsx')
const dayjs = require("dayjs");
const fs = require('fs');
const path = require("path");

async function getChannelMessages(Auth, channelId, count = 5000) {
    const headers = {
        Authorization: Auth,
        'Content-Type': 'application/json'
    };

    const offset = [...new Array(Math.floor(count / 100))];
    const url = `https://discord.com/api/v9/channels/${channelId}/messages?limit=100`;
    const curMessages = await axios.get(url, {
        headers,
    }).then(res => res.data)
    let messages = [...curMessages];

    for (let n of offset) {
        const url = `https://discord.com/api/v9/channels/${channelId}/messages?limit=100&before=${messages[messages.length - 1].id}`;
        const res = await axios.get(url, {
            headers,
        }).then((res) => res.data)
        messages = messages.concat(res);
        await delay(200);
    }

    return messages;
}

getChannelMessages("", "")
    .then(res => {
        const unionMessages = unionBy(res, item => item.author.username);

        const title = ["电报名", "内容", "附件信息", "时间"];
        const data = [];

        // 时间最新的在最前面，倒序
        unionMessages.reverse().map(message => {
            const item = [];

            item.push(message.author.username);
            item.push(message.content);
            message.attachments.map(attachment => {
                item.push(attachment.url);
            })
            item.push(dayjs(message.timestamp).format("YYYY-MM-DD HH:mm:ss"));

            data.push(item);
        })

        data.push(title);

        let buffer = xlsx.build([
            {
                name: 'sheet1',
                data: data
            }
        ]);

        fs.writeFileSync(path.join(__dirname, "AMA抽奖顺序（来自discord发送消息顺序，去重）.xlsx"), buffer, {'flag': 'w'});

        console.log("总共信息：", res.length);
        console.log("去掉重复的用户名人数：", unionMessages.length);
    });
