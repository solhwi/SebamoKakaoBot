const scriptName = "세바모봇";
 
const maxCount = 4;
const fees = new Array(3000, 5000, 10000, 30000);
 
let members = new Array('나경', '유진', '민준', '솔휘', '주훈');
let memberNicknames = new Array('김나경', '박주훈', '김민준', '안유진', '박솔휘', '유지현', 'DEBUG SENDER');

let managerName = '안유진';
 
let sebamo = android.os.Environment.getExternalStorageDirectory().getAbsolutePath(); //절대 경로
 
let isQuestProgressing = false;

function SetMission(member, isPlus)
{
  var memberDictionary = GetMemberToDoInfo(true, false);
  var currentCount = memberDictionary[member];
  
  if (isPlus)
  {
    memberDictionary[member] = currentCount < maxCount ? currentCount + 1 : currentCount;
  }
  else
  {
    memberDictionary[member] = currentCount > 0 ? currentCount - 1 : currentCount;
  }
  
  SetMemberToDoInfo(memberDictionary, true, false);
}

// 일일 미션 클리어
function CompleteMission(member)
{
  SetMission(member, true);
}

// 일일 미션 복원
function RollbackMission(member)
{
  SetMission(member, false);
}
 
// 카카오톡 호출 시
function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) 
{
  if(IsSebamoGroupChat(sender, isGroupChat))
  {
    ParseMsg(msg, sender, replier);
  }
}
 
// 세바모인 경우 메시지 파싱
function ParseMsg(originMsg, sender, replier)
{
  if(originMsg == null)
  {
    return;
  }
 
  var words = originMsg.split(' ');
  if(words == null || words.length <= 0)
  {
    return;
  }
  
  if(isQuestProgressing)
  {
    isQuestProgressing = false;
    if(words[0] == 'Y')
    {
      ParseMsg("/PrivateInitializeFee", sender, replier);
    }  
  } 
  
  var command = "";
  var member = "";
  var value = "";
 
  if(words.length <= 1)
  {
    command = words[0];
    if(IsValidCommand(command, sender))
    {
      UpdatePlan(command, member);
      Reply(command, "", 0, replier);
    }
  }
  else if(words.length <= 2)
  {
    command = words[0];
    member = words[1];
    if(IsValidCommand(command, sender) && IsValidMember(member))
    {
      UpdatePlan(command, member);
      Reply(command, member, 0, replier);
    }
  }
  else if(words.length <= 3)
  {
    command = words[0];
    member = words[1];
    value = words[2];
    if(IsValidCommand(command, sender) && IsValidMember(member) && IsValidValue(value))
    {
      UpdatePlan(command, member, parseInt(value));
      Reply(command, member, parseInt(value), replier);
    }
  }
}
 
// 커맨드에 맞게 데이터 갱신
function UpdatePlan(command, member, value)
{ 
  if(command == '/완료')
  {
    CompleteMission(member);
  }
  else if(command == '/송금')
  {
    SubFee(member, value);
  }
  else if(command == '/완료복원')
  {
    RollbackMission(member);
  }
  else if(command == '/초기화')
  {
    InitializeMemberInfo(true, false);
  }
  else if(command == '/벌금초기화')
  {
    isQuestProgressing = true;
  }
  else if(command == '/PrivateInitializeFee')
  {
    InitializeMemberInfo(false, false);
    InitializeMemberInfo(false, true);
  }
}
 
let commands = new Array('/완료','/완료복원', '/확인', '/초기화', '/도움말', '/벌금초기화', '/송금', '/벌금현황', '/주간벌금반영', '/PrivateInitializeFee');
 
// 답장
function Reply(command, member, value, replier)
{
  var memberWeeklyDictionary = GetMemberToDoInfo(true, false);
  var memberEternalDictionary = GetMemberToDoInfo(false, false);
  var memberRecordDictionary = GetMemberToDoInfo(false, true);
  
  var ReplymentStr = "";
 
  if(command == '/완료')
  {
    ReplymentStr = member + ' 님이 하루 치의 목적을 달성하였어요. (' + String(memberWeeklyDictionary[member]) + '/' + String(maxCount) + ')';
  }
  else if(command == '/완료복원')
  {
    ReplymentStr = member + ' 님이 하루 치의 성취를 복원하였어요. (' + String(memberWeeklyDictionary[member]) + '/' + String(maxCount) + ')';
  }
  else if(command == '/확인')
  {
      ReplymentStr = "* 이번 주 To Do *\n\n";
      for (var [key, value] in memberWeeklyDictionary) 
      {
        ReplymentStr += String(key) +  "(" + String(value)  + "/" + String(maxCount) + ")\n";   
      }
  }
  else if(command == '/초기화')
  {
    ReplymentStr = "한 주 기록만 초기화되었습니다. 누적 벌금에는 영향이 가지 않습니다.";
  }
  else if(command == '/주간벌금반영')
  {
    Reply('/확인', member, 0, replier); // 초기화 전에 한번 확인 공지
    AddFeeByWeekly(); // 주간 벌금을 전체 벌금표에 더해줌
    InitializeMemberInfo(true, false); // 초기화 
    Reply('/벌금현황', member, value, replier);
    
    ReplymentStr = "한 주 기록이 초기화되었습니다. 누적 벌금은 위와 같습니다...";
  }
  else if(command == '/도움말')
  {
    ReplymentStr = "❓ 도움말\n\n";
    ReplymentStr += "/완료 (이름) \n > (이름)의 일일 미션 완료를 기록합니다.\n\n";
    ReplymentStr += "/완료복원 (이름) \n > 완료한 (이름)의 일일 미션을 없던 일로 합니다.\n\n";
    ReplymentStr += "/확인 \n > 본인 및 다른 사람의 진행 정도를 알려줍니다.\n\n";
    ReplymentStr += "/초기화 \n > 주간 일일 미션들을 초기화할 수 있습니다. \n⚠️ 총무만 사용 가능합니다.\n\n";
    ReplymentStr += "/주간벌금반영 \n > 한 주의 기록을 초기화하고, 벌금을 환산합니다. \n⚠️ 총무만 사용 가능합니다.\n\n";
    ReplymentStr += "/송금 (이름) (금액) \n > (이름)으로 (금액)만큼 송금합니다.\n\n";
    ReplymentStr += "/벌금현황 \n > 전체 벌금표를 조회합니다.\n\n";
    ReplymentStr += "/벌금초기화 \n > 전체 벌금을 초기화합니다. \n⚠️ 총무만 사용 가능합니다."; 
  }
  else if(command == '/송금')
  {
    ReplymentStr = member + " 님의 벌금 잔액은 " + memberEternalDictionary[member]  + " 입니다.";
  }
  else if(command == '/벌금현황')
  {
    ReplymentStr = "💰 벌금표 💰\n\n";
    
    var totalFee = 0;
    for (var [key, val] in memberRecordDictionary) 
    {
       totalFee += parseInt(val);
    }
    
    for (var [key, val] in memberEternalDictionary) 
    {
      ReplymentStr += String(key) +  "(잔액 : " + String(val) + "원)\n";
      ReplymentStr += "> 총 누적 : " + memberRecordDictionary[key] + "원\n";
      
      var percentage = parseInt(memberRecordDictionary[key]) * 100 / totalFee;
      ReplymentStr += "> 공헌 비율 : " + (percentage).toFixed(2) + "%\n\n";   
    }
    ReplymentStr += "케이뱅크 100191000123 으로 보내시면 됩니다.";
  }
  else if(command == '/벌금초기화')
  {
    ReplymentStr = "(주의) 정말 벌금을 초기화하시겠습니까?\n기록이 모두 사라집니다.\n( Y / Any Key )";
  }
  else if(command == '/PrivateInitializeFee')
  {
    ReplymentStr = "벌금 기록이 초기화되었습니다.";
  }
 
 
  replier.reply(ReplymentStr);
}
 
// 미션 수행한 횟수를 벌금으로 환산 
function GetFeeByWeeklyDidCount(didCount)
{
  var count = maxCount - didCount;
  if(count < 0)
  {
    count = 0;
  }
  else if(count > maxCount)
  {
    count = maxCount;
  }
  
  if(count >= 1 && count <= maxCount)
  {
    return fees[count - 1];
  }
  
  return 0; 
}
 
function AddFeeByWeekly()
{
  var memberDictionary = GetMemberToDoInfo(true, false);
  var memberEternalDictionary = GetMemberToDoInfo(false, false);
  var memberRecordDictionary = GetMemberToDoInfo(false, true);
  
  for (var [key, value] in memberDictionary) 
  {
    memberEternalDictionary[key] += GetFeeByWeeklyDidCount(value);
    memberRecordDictionary[key] += GetFeeByWeeklyDidCount(value);
  }
  
  SetMemberToDoInfo(memberEternalDictionary, false, false);
  SetMemberToDoInfo(memberRecordDictionary, false, true);
}
 
function SubFee(member, value)
{
  var memberEternalDictionary = GetMemberToDoInfo(false, false);
  
  var newValue = memberEternalDictionary[member] - value;
 
  if(newValue < 0)
  {
    newValue = 0;
  }
 
  memberEternalDictionary[member] = newValue;
 
  SetMemberToDoInfo(memberEternalDictionary, false, false);
}
 
// 현재 세바모 그룹 채팅인가?
function IsSebamoGroupChat(sender, isGroupChat)
{
  return IsSebamoNickname(sender) && !isGroupChat;
}

function IsSebamoNickname(sender)
{
  for(var i = 0; i < memberNicknames.length; i++)
  {
    if(sender == memberNicknames[i])
    {
      return true;
    }
  }
  return false;
}

function IsManagedCommand(command)
{
  return command == '/초기화' || command == '/주간벌금반영' || command == '/벌금초기화' || command == '/PrivateInitializeFee';
}

function IsManager(member)
{
  return member == managerName;
}
 
function IsValidCommand(command, member)
{
  for(var i = 0; i < commands.length; i++)
  {
    if(commands[i] == command)
    {
      return !IsManagedCommand(command) || IsManager(member);
    }
  }
 
  return false;
}
 
// 세바모 멤버인가?
function IsValidMember(memberName)
{
  for(var i = 0; i < members.length; i++)
  {
    if(members[i] == memberName)
    {
      return true;
    }
  }
 
  return false;
}
 
function IsValidValue(value)
{
  return isNaN(value) == false;
}
 
function IsParamCommand(command)
{
  return command == "/완료";
}
 
function IsTwoParamCommand(command)
{
  return command == "/송금";
}
 
// 멤버 정보 초기화 (주 단위, 영구 단위)
function InitializeMemberInfo(isWeekly, isRecord)
{
  var dic = {"나경" : 0, "유진" : 0, "민준" : 0, "솔휘" : 0, "주훈" : 0 };
  SetMemberToDoInfo(dic, isWeekly, isRecord);
}
 
// 멤버 정보 가져오기 (주 단위, 영구 단위)
function GetMemberToDoInfo(isWeekly, isRecord)
{
  var jsonPath = "";
  jsonPath = isWeekly ? "/sebamoWeekly.json" : "/sebamoEternal.json";
  jsonPath = isRecord ? "/sebamoRecord.json" : jsonPath;
 
  var jsonData = read(sebamo + jsonPath);
  var dic = JSON.parse(jsonData);
  
  if (dic == null)
  {
      dic = {"나경" : 0, "유진" : 0, "민준" : 0, "솔휘" : 0, "주훈" : 0 }; 
  }
  
  return dic;
}
 
// 멤버 정보 저장하기 (주 단위, 영구 단위)
function SetMemberToDoInfo(memberDictionary, isWeekly, isRecord)
{
  var jsonPath = "";
  jsonPath = isWeekly ? "/sebamoWeekly.json" : "/sebamoEternal.json";
  jsonPath = isRecord ? "/sebamoRecord.json" : jsonPath;
  save(sebamo + jsonPath, JSON.stringify(memberDictionary));
}
 
 
//아래 4개의 메소드는 액티비티 화면을 수정할때 사용됩니다.
function onCreate(savedInstanceState, activity) 
{
  var textView = new android.widget.TextView(activity);
  textView.setText("Hello, World!");
  textView.setTextColor(android.graphics.Color.DKGRAY);
  activity.setContentView(textView);
}
 
function onStart(activity) {}
 
function onResume(activity) {}
 
function onPause(activity) {}
 
function onStop(activity) {}
 
function save(originpath, content) 
{
  // originpath는 sdcard/폴더/파일
  var splited_originpath = originpath.split('/');
  splited_originpath.pop();
    
  var path = splited_originpath.join('/');
  var folder = new java.io.File(path);
  folder.mkdirs();
    
  var file = new java.io.File(originpath);
  var fos = new java.io.FileOutputStream(file);
  var contentstring = new java.lang.String(content);
    
  fos.write(contentstring.getBytes());
  fos.close();
}
function save(originpath, content) 
{
  // originpath는 sdcard/폴더/파일
  var splited_originpath = originpath.split('/');
  splited_originpath.pop();
    
  var path = splited_originpath.join('/');
  var folder = new java.io.File(path);
  folder.mkdirs();
    
  var file = new java.io.File(originpath);
  var fos = new java.io.FileOutputStream(file);
  var contentstring = new java.lang.String(content);
    
  fos.write(contentstring.getBytes());
  fos.close();
}
 
function read(originpath) 
{
  var file = new java.io.File(originpath);
  if (file.exists() == false) 
    return null;
      
  try 
  {
      var fis = new java.io.FileInputStream(file);
      var isr = new java.io.InputStreamReader(fis);
      var br = new java.io.BufferedReader(isr);
        
      var temp_br = br.readLine();
      var temp_readline = '';
        
      while ((temp_readline = br.readLine()) !== null) 
      {
          temp_br += '\n' + temp_readline;
      }
        
      try 
      {
          fis.close();
          isr.close();
          br.close();
            
          return temp_br;
      } 
      catch (error)
      {
          return error;
      }
    } 
    catch (error) 
    {
        return error;
    }
}
