window.gameQuestions = window.gameQuestions || {}; // تأكد من أن الكائن موجود

window.gameQuestions.risk_game = {
    topics: [
        {
            name: "أين هم الآن",
            questions: [
                {
                    q: "أين هو الآن اللاعب عمر مرموش؟",
                    a: "مانشستر سيتي",
                    points: 5,
                    choices: ["سانت باولي", "مانشستر سيتي", "مانشستر يونايتد", "فولفسبورغ"]
                },
                {
                    q: "أين هو الآن اللاعب خالد قمر؟",
                    a: "طلائع الجيش",
                    points: 10,
                    choices: ["طلائع الجيش", "الإنتاج الحربي", "الاتحاد السكندري", "اتحاد الشرطة"]
                },
                {
                    q: "أين هو الآن اللاعب فان دي بيك؟",
                    a: "آينتراخت فرانكفورت",
                    points: 20,
                    choices: ["آينتراخت فرانكفورت", "أياكس أمستردام", "سبارتا روتردام", "أوتريخت"]
                },
                {
                    q: "أين هو الآن  لوكاس بودولسكي؟ (ايوه لسه بيلعب)",
                    a: "غورنيك زابجه",
                    points: 40,
                    choices: ["غورنيك زابجه", "بياست غليفيتسه", "بوخوم", "بفورتسهايم"]
                }
            ]
        },
        {
            name: "الألفينات",
            questions: [
                {
                    q: "من اللاعب الذي سجل هدفًا بالقدم اليسرى في نهائي دوري أبطال أوروبا 2002 والذي يُعتبر أحد أعظم الأهداف في تاريخ المسابقة؟",
                    a: "زين الدين زيدان",
                    points: 5,
                    choices: ["راؤول غونزاليس", "فرناندو مورينتس", "زين الدين زيدان", "لويس فيغو"]
                },
                {
                    q: "فاز بلقب هداف كأس العالم 2006 اللاعب ميروسلاف كلوزه، من كان المركز الثاني خلفه في الترتيب؟",
                    a: "دافيد فيا",
                    points: 10,
                    choices: ["فرناندو توريس", "هيرنان كريسبو", "لوكاس بودولسكي", "دافيد فيا"]
                },
                {
                    q: "فاز الميلان في نهائي دوري ابطال اوروبا 2006-2007 على ليفربول بنتيجة 2-1، احرز فيليبو إنزاجي هدفي الميلان، فمن أحرز هدف ليفربول ؟",
                    a: "ديرك كاوت",
                    points: 20,
                    choices: ["ديرك كاوت", "بيتر كراوتش", "هاري كيويل", "سامي هيبيا"]
                },
                {
                    q: "كم عدد البطاقات الصفراء التي أشهرها الحكم في نهائي كأس العالم 2010؟ مع العلم أنه حطم الرقم القياسي السابق البالغ 6 بطاقات في نهائي 1986",
                    a: "14",
                    points: 40,
                    choices: ["14", "12", "8", "10"]
                }
            ]
        },
        {
            name: "الأهلي",
            questions: [
                {
                    q: "من هو حارس مرمى النادي الأهلي التاريخي الملقب بـ (السد العالي)؟",
                    a: "عصام الحضري",
                    points: 5,
                    choices: ["ثابت البطل", "إكرامي", "عصام الحضري", "محمد الشناوي"]
                },
                {
                    q: "في نهائي دوري أبطال إفريقيا موسم 2004-2005 بين الأهلي والنجم الساحلي، من هو اللاعب الذي سجل الهدف الثالث للأهلي في الدقيقة 90+2؟",
                    a: "محمد بركات",
                    points: 10,
                    choices: ["أسامة حسني", "محمد أبو تريكة", "محمد بركات", "وائل رياض"]
                },
                {
                    q: "كم هو أطول عدد من السنوات المتتالية التي حقق فيها النادي الأهلي لقب الدوري المصري؟",
                    a: "9 سنوات متتالية",
                    points: 20,
                    choices: ["7 سنوات متتالية", "8 سنوات متتالية", "9 سنوات متتالية", "10 سنوات متتالية"]
                },
                {
                    q: "في كأس العالم للأندية 2012، أحرز النادي الأهلي هدفين في البطولة. بخلاف محمد أبو تريكة، من هو اللاعب الآخر الذي سجل هدفًا للأهلي في تلك البطولة؟",
                    a: "السيد حمدي",
                    points: 40,
                    choices: ["عماد متعب", "السيد حمدي", "عبدالله السعيد", "محمد بركات"]
                },
            ]
        },
        {
            name: "كريستيانو رونالدو",
            questions: [
                {
                    q: "ما هو النادي الذي بدأ فيه كريستيانو رونالدو مسيرته الاحترافية؟",
                    a: "سبورتينغ لشبونة",
                    points: 5,
                    choices: ["بنفيكا", "بورتو", "سبورتينغ لشبونة", "ماديرا سبورت"]
                },
                {
                    q: "كم عدد البطولات التي حققها كريستيانو رونالدو مع نادي مانشستر يونايتد؟",
                    a: "10 بطولات",
                    points: 10,
                    choices: ["8 بطولات", "9 بطولات", "10 بطولات", "11 بطولات"]
                },
                {
                    q: "كم هدفاً من ركلة حرة مباشرة أحرز كريستيانو رونالدو مع نادي يوفنتوس؟",
                    a: "هدف واحد",
                    points: 20,
                    choices: ["هدف واحد", "3 أهداف", "7 أهداف", "11 هدف"]
                },
                {
                    q: "ما هو الفريق الذي واجهه كريستيانو رونالدو 5 مرات في مسيرته الاحترافية ولم ينجح في التسجيل في مرماه؟",
                    a: "نادي بنفيكا",
                    points: 40,
                    choices: ["نادي بنفيكا", "منتخب تركيا", "نادي ليل", "منتخب البانيا"]
                }
            ]
        }
    ]
};