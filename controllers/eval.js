const db = require('../util/database.js');
const url = require('url');
const { DATE } = require('mysql2/lib/constants/types');


exports.getQuestions = (req, res, next) => {
  var questions =[];
  var previousQid = new Set();
  const parsed_url = url.parse(req.url,true);
  const group = parsed_url.query.group;
  const uid = parsed_url.query.uid;
  

  db.execute(`SELECT * FROM user having user.uid= ${uid}`).then(([user_rows]) => {
    if(user_rows.length > 0){
      for(let i=0 ;i<user_rows.length ;i++ ){
        previousQid.add(user_rows[i].qid);
      }
    }
  }).then(() => {
    if(previousQid.size > 0){
      db.execute(`SELECT * FROM questions`).then(([rows]) =>{
        previousQid.forEach((item) =>{
          rows[item-1].options = [];
          questions.push(rows[item-1]);
        })
      }).then(() =>{
        db.execute('SELECT * FROM choices').then(([rows]) =>{
          for(let i=0; i<questions.length; i++){
            for(let j=0; j<rows.length ;j++){
              if(questions[i].qid == rows[j].qid){
                let temp = { choice:"", ansid: 0 }
                temp.choice = rows[j].choice;
                temp.ansid = rows[j].ansid;
                questions[i].options.push(temp);
              }
            }
          }
        }).then(() =>{
          db.execute(`select * from time WHERE time.uid= ${uid} `).then(([time_rows])=>{
            if(time_rows.length==0)
            db.execute('INSERT INTO time (`uid`,`group`,`start_time`) VALUES (?,?,?)',[uid,group,new Date()]);
          })
          
        }).then(() => {res.status(200).json(questions);})
      })
    }else{
      db.execute(`SELECT * FROM questions WHERE questions.group = ${group} ORDER BY RAND()`).then(([rows]) =>{
        let counter1 = 0;
        let counter2 = 0;
        let counter3 = 0;

        for(let i=0 ;i<rows.length ;i++ ){
          if(rows[i].level==1 && counter1<=2){
            rows[i].options = [];
            questions.push(rows[i]);
            counter1++;
          }
          if(rows[i].level==2 && counter2<=2){
            rows[i].options = [];
            questions.push(rows[i]);
            counter2++;
          }
          if(rows[i].level==3 && counter3<=3){
            rows[i].options = [];
            questions.push(rows[i]);
            counter3++;
          }
          if(counter2+counter3+counter1 == 10){ break; }
        }
        questions.sort((a, b) => (a.level > b.level) ? 1 : -1);
    }).then(() =>{
      db.execute('SELECT * FROM choices').then(([rows]) =>{
        for(let i=0; i<questions.length; i++){
          for(let j=0; j<rows.length ;j++){
            if(questions[i].qid == rows[j].qid){
              let temp = { choice:"", ansid: 0 }
              temp.choice = rows[j].choice;
              temp.ansid = rows[j].ansid;
              questions[i].options.push(temp);
            }
          }
        }
      }).then(() => {
          for(let j=0;j<questions.length;j++)
          db.execute('INSERT INTO user (`uid`,`qid`) VALUES (?,?)',[uid,questions[j].qid] )

          db.execute('INSERT INTO time (`uid`,`group`,`start_time`) VALUES (?,?,?)',[uid,group,new Date()]);
        res.status(200).json(questions);
      }) //inserting into database has to be done here
    })}
})};

exports.postResult = (req, res, next) => {

  var qid=req.body.qid;
  var answer=req.body.answer;
  var uid = req.body.uid;
  var group=req.body.group;
  var score = 0;
  db.execute(`SELECT * FROM user WHERE user.uid = ${uid}`).then(([user_rows]) => {
    if(user_rows.length > 0)
    {
      
      db.execute(`select * from time WHERE time.uid= ${uid}`).then(([time_rows])=>{ 
        var index=time_rows[0].index;
        db.execute('INSERT INTO time (`uid`,`group`,`start_time`,`end_time`) VALUES (?,?,?,?)',[uid,group,time_rows[0].start_time,new Date()]);
        db.execute(`DELETE FROM time WHERE time.index=  ${index}  `);
      });
      db.execute(`DELETE  from user WHERE user.uid= ${uid}`).then(()=>{
        for(let i=0;i<answer.length;i++){
          for(let j=0;j<answer[i].length;j++){
           
            db.execute('INSERT INTO user ( `uid`, `qid` , `ansid`) VALUES (?,?,?)',
              [uid,qid[i],answer[i][j]]
            );
          }
        }
      })
      
      }
        else{
          for(let i=0;i<answer.length;i++){
            for(let j=0;j<answer[i].length;j++){
             
              db.execute('INSERT INTO user ( `uid`, `qid` , `ansid`) VALUES (?,?,?)',
                [uid,qid[i],answer[i][j]]
              );
            }
          }
        }
      });
  
  db.execute('SELECT * FROM choices')
  .then(([rows])=>{

    for(let i=0;i<qid.length;i++){
      var k=0;
      for(let j=0 ;j<rows.length ;j++){
        if(qid[i]==rows[j].qid){   
          for(let l=0;l<answer[i].length;l++){
            if(rows[j].ansid==answer[i][l] && rows[j].isAnswer==1)
            k++;
          }
        }
      }
      if(k==answer[i].length)
      score++;  
    }
    console.log(score);
  })
  .then(() => {
    res.status(201).json({
      message: 'Answers Stored Successfully!',
      post: {uid: uid, qid: qid, score: score }
    })
  });
};