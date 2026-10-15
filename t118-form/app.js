(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var F = window.F, CFG = window.APP_CONFIG || {};

  // ---------- Рендер опций ----------
  function fill(sel, list) { list.forEach(function (t) { var o = document.createElement("option"); o.value = o.textContent = t; sel.appendChild(o); }); }
  fill($("country"), window.COUNTRIES);
  fill($("gender"), F.GENDER);
  var RADIO = { nationality: F.NATIONALITY, eduF: F.EDU, eduM: F.EDU, place: F.PLACE, housing: F.HOUSING, family: F.FAMILY };
  var CHECK = { parents: F.PARENTS, step: F.STEP, social: F.SOCIAL, ped: F.PED, cats: F.CATS, services: F.SERVICES };
  document.querySelectorAll("[data-radio]").forEach(function (box) {
    var name = box.dataset.radio;
    RADIO[name].forEach(function (t) { box.insertAdjacentHTML("beforeend", '<label><input type="radio" name="' + name + '" value="' + t + '"> <span>' + t + "</span></label>"); });
  });
  document.querySelectorAll("[data-check]").forEach(function (box) {
    var name = box.dataset.check;
    CHECK[name].forEach(function (t) { box.insertAdjacentHTML("beforeend", '<label><input type="checkbox" name="' + name + '" value="' + t.replace(/"/g, "&quot;") + '"> <span>' + t + "</span></label>"); });
  });
  if (!CFG.ENDPOINT) $("demo").hidden = false;

  // ---------- ИИН ----------
  function iinChecksumOk(s) {
    if (!/^\d{12}$/.test(s)) return false;
    var d = s.split("").map(Number), w1 = [1,2,3,4,5,6,7,8,9,10,11], w2 = [3,4,5,6,7,8,9,10,11,1,2];
    var c = w1.reduce(function (a, w, i) { return a + w * d[i]; }, 0) % 11;
    if (c === 10) { c = w2.reduce(function (a, w, i) { return a + w * d[i]; }, 0) % 11; if (c === 10) return false; }
    return c === d[11];
  }
  function iinParse(s) { // -> {date:"YYYY-MM-DD", gender} | null
    if (!/^\d{12}$/.test(s)) return null;
    var c = +s[6], cent = { 1: 1800, 2: 1800, 3: 1900, 4: 1900, 5: 2000, 6: 2000 }[c];
    if (!cent) return null;
    var y = cent + +s.slice(0, 2), m = +s.slice(2, 4), d = +s.slice(4, 6);
    var dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
    return { date: y + "-" + s.slice(2, 4) + "-" + s.slice(4, 6), gender: c % 2 ? "Мальчик" : "Девочка" };
  }
  window.__iin = { ok: iinChecksumOk, parse: iinParse };

  function today() { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
  function ageOn(iso, ref) {
    var p = iso.split("-").map(Number), a = ref.getFullYear() - p[0];
    if (ref.getMonth() + 1 < p[1] || (ref.getMonth() + 1 === p[1] && ref.getDate() < p[2])) a--;
    return a;
  }
  function ruDate(iso) { return iso ? iso.split("-").reverse().join(".") : ""; }

  // ---------- Ошибки ----------
  function setErr(key, msg) {
    var el = document.querySelector('.err[data-for="' + key + '"]'); if (el) el.textContent = msg || "";
    var inp = $(key); if (inp && inp.tagName !== "DIV") inp.classList.toggle("invalid", !!msg);
    return !msg;
  }

  // ---------- Иностранец ----------
  function isForeign() { return $("foreign").checked; }
  function onForeign() {
    var f = isForeign();
    $("foreignBox").hidden = !f;
    $("iinTitle").textContent = f ? "ИИН студента (если есть)" : "ИИН студента";
    $("iinLabel").classList.toggle("req", !f);
    $("gender").disabled = !f && !!iinParse($("iin").value);
    $("genderHint").hidden = f;
    $("genderLabel").classList.toggle("req", f);
    if (!f) { $("country").value = "Не указано"; $("passport").value = ""; }
    onIin(); 
  }
  $("foreign").addEventListener("change", onForeign);

  function onIin() {
    var el = $("iin"); el.value = el.value.replace(/\D/g, "").slice(0, 12);
    var v = el.value, info = $("iinInfo"); info.textContent = "";
    setErr("iin", "");
    var p = iinParse(v);
    if (v.length === 12 && p && iinChecksumOk(v)) {
      info.textContent = "ИИН корректен · дата рождения " + ruDate(p.date) + " · " + (p.gender === "Мальчик" ? "мужской" : "женский");
      if (!isForeign()) { $("gender").value = p.gender; $("gender").disabled = true; }
      var ia = ageOn(p.date, today()); if (ia >= 18 && ia <= 100) { checkAge(); showAdult(); return; }
    } else {
      if (!isForeign()) $("gender").disabled = false;
      if (v.length === 12) setErr("iin", p ? "Неверный ИИН: не сходится контрольная цифра. Проверьте цифры." : "Неверный ИИН: первые 6 цифр — дата рождения ГГММДД, 7-я — от 1 до 6.");
    }
    checkAge();
  }
  $("iin").addEventListener("input", onIin);
  $("birth").addEventListener("change", checkAge);

  // ---------- Возраст ----------
  function birthIso() { return $("birth").value || (!isForeign() && iinChecksumOk($("iin").value) ? iinParse($("iin").value).date : ""); }
  function checkAge() {
    var b = birthIso(), box = $("ageBox");
    if (!b) { box.hidden = true; return null; }
    var a = ageOn(b, today());
    box.hidden = false;
    if (a < 0 || a > 100) { box.className = "age bad"; box.textContent = "Проверьте дату рождения."; return a; }
    box.className = a >= 18 ? "age bad" : "age";
    box.textContent = a >= 18 ? "Вам " + a + " лет. Анкета нужна только тем, кому нет 18." : "Возраст: " + a + " — анкету нужно заполнить.";
    return a;
  }

  // ---------- Условные поля блока 2 ----------
  document.querySelectorAll('input[name="family"]').forEach(function (r) {
    r.addEventListener("change", function () {
      var show = r.checked && r.value === "Неполная семья";
      $("parentsBox").hidden = !show;
      if (!show) document.querySelectorAll('input[name="parents"]').forEach(function (c) { c.checked = false; });
    });
  });
  var pedTrigger = document.querySelector('input[name="social"][value="' + F.PED_TRIGGER + '"]');
  pedTrigger.addEventListener("change", function () {
    $("pedBox").hidden = !pedTrigger.checked;
    if (!pedTrigger.checked) document.querySelectorAll('input[name="ped"]').forEach(function (c) { c.checked = false; });
  });
  document.querySelectorAll("input.num").forEach(function (i) {
    i.addEventListener("input", function () { i.value = i.value.replace(/\D/g, "").slice(0, 3); if (i.id === "kids") onKids(); checkKids(); });
  });
  function onKids() {
    var show = $("kids").value !== "";
    $("kidsBox").hidden = !show;
    if (!show) ["kidsOrder", "kidsAdult", "kidsSchool", "kidsPre"].forEach(function (k) { $(k).value = ""; });
  }
  function checkKids() {
    setErr("kidsSum", "");
    if ($("kids").value === "") return true;
    var t = +$("kids").value, o = $("kidsOrder").value, parts = ["kidsAdult", "kidsSchool", "kidsPre"].map(function (k) { return $(k).value; });
    if (o !== "" && (+o < 1 || +o > t)) return setErr("kidsSum", "Порядковый номер ребёнка должен быть от 1 до " + t + ".");
    if (parts.some(function (p) { return p !== ""; })) {
      var s = parts.reduce(function (a, p) { return a + (+p || 0); }, 0);
      if (s !== t) return setErr("kidsSum", "Сумма по возрастам (" + s + ") не равна количеству детей (" + t + ").");
    }
    return true;
  }

  // ---------- Маска телефона ----------
  function fmtPhone(v) {
    var d = v.replace(/\D/g, "");
    if (d[0] === "8") d = "7" + d.slice(1);
    if (d && d[0] !== "7") d = "7" + d;
    d = d.slice(0, 11);
    var out = "+7", rest = d.slice(1);
    if (rest.length) out += " " + rest.slice(0, 3);
    if (rest.length > 3) out += " " + rest.slice(3, 6);
    if (rest.length > 6) out += " " + rest.slice(6, 8);
    if (rest.length > 8) out += " " + rest.slice(8, 10);
    return d ? out : "";
  }
  document.querySelectorAll("input.phone").forEach(function (i) {
    i.addEventListener("input", function () { i.value = fmtPhone(i.value); setErr(i.id, ""); });
  });
  function phoneOk(v) { return v === "" || /^\+7 7\d{2} \d{3} \d{2} \d{2}$/.test(v); }

  // ---------- Валидация ----------
  function validate() {
    var errs = [], f = isForeign(), iin = $("iin").value, fio = $("fio").value.trim().replace(/\s+/g, " ");
    $("fio").value = fio;
    if (!/^[A-Za-zА-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі'’\-]+( [A-Za-zА-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі'’\-]+)+$/.test(fio)) { setErr("fio", "Укажите фамилию и имя (и отчество, если есть) буквами."); errs.push("ФИО"); } else setErr("fio", "");
    if (!f || iin) {
      if (!iin) { setErr("iin", "Укажите ИИН (12 цифр)."); errs.push("ИИН"); }
      else if (!iinParse(iin) || !iinChecksumOk(iin)) { setErr("iin", "Неверный ИИН. Проверьте цифры."); errs.push("ИИН"); }
    }
    var b = $("birth").value;
    if (!b) { setErr("birth", "Укажите дату рождения."); errs.push("Дата рождения"); }
    else if (iin && iinParse(iin) && iinChecksumOk(iin) && iinParse(iin).date !== b) { setErr("birth", "Дата не совпадает с ИИН (" + ruDate(iinParse(iin).date) + "). Проверьте ИИН или дату."); errs.push("Дата рождения"); }
    else { var a = ageOn(b, today()); if (a < 10 || a > 60) { setErr("birth", "Проверьте дату рождения."); errs.push("Дата рождения"); } else setErr("birth", ""); }
    if (f && $("gender").value === "Не указан") { setErr("gender", "Выберите пол."); errs.push("Пол"); } else setErr("gender", "");
    ["phoneM", "phoneF", "phone"].forEach(function (k) { if (!phoneOk($(k).value)) { setErr(k, "Номер неполный: +7 7XX XXX XX XX"); errs.push("Телефон"); } });
    if (!checkKids()) errs.push("Количество детей");
    if (!$("consent").checked) { setErr("consent", "Нужно подтвердить согласие."); errs.push("Согласие"); } else setErr("consent", "");
    return errs;
  }

  // ---------- Сбор строки ----------
  function radio(n) { var r = document.querySelector('input[name="' + n + '"]:checked'); return r ? r.value : ""; }
  function checks(n) { return Array.prototype.map.call(document.querySelectorAll('input[name="' + n + '"]:checked'), function (c) { return c.value; }).join("; "); }
  function collect() {
    var f = isForeign(), iin = $("iin").value, p = iinChecksumOk(iin) ? iinParse(iin) : null, b = $("birth").value;
    var age = ageOn(b, today()), notes = [];
    if (p && p.date !== b) notes.push("дата ≠ ИИН");
    if (f && !iin) notes.push("иностранец без ИИН");
    var v = {
      "Отметка времени": new Date().toISOString(),
      "Курс": CFG.COURSE || "1 курс", "Группа": CFG.GROUP || "Т118",
      "ФИО студента": $("fio").value, "ИИН студента": iin, "Иностранный гражданин": f ? "Да" : "Нет",
      "Страна гражданства": f ? $("country").value : "", "Паспорт": f ? $("passport").value.trim() : "",
      "Дата рождения": ruDate(b), "Пол": $("gender").value === "Не указан" ? "" : $("gender").value,
      "Национальность": radio("nationality"), "Отец": $("father").value.trim(), "Мать": $("mother").value.trim(),
      "Опекун / попечитель": $("guardian").value.trim(), "Образование отца": radio("eduF"), "Образование матери": radio("eduM"),
      "Место работы отца": $("workF").value.trim(), "Место работы матери": $("workM").value.trim(), "Место работы опекуна": $("workG").value.trim(),
      "Адрес проживания": $("address").value.trim(), "Место проживания": radio("place"), "Тип жилья": radio("housing"),
      "Телефон матери": $("phoneM").value, "Телефон отца": $("phoneF").value, "Телефон": $("phone").value,
      "Состав семьи": radio("family"), "Наличие родителей": checks("parents"),
      "Проживает с отчимом / мачехой / с сожителем / сожительницей родителя": checks("step"),
      "Количество детей в семье": $("kids").value, "Которым по счету ребенком является обучающийся": $("kidsOrder").value,
      "Из них совершеннолетних": $("kidsAdult").value, "Из них школьного возраста": $("kidsSchool").value, "Из них дошкольного возраста": $("kidsPre").value,
      "Социальные категории": checks("social"), "Основания повышенного педагогического внимания": checks("ped"),
      "Относится к следующим категориям обучающихся и воспитанников": checks("cats"),
      "Относится к получателям следующих государственных услуг": checks("services"),
      "Возраст на дату заполнения": String(age), "Младше 18": age < 18 ? "Да" : "Нет",
      "Дата рождения по ИИН": p ? ruDate(p.date) : "", "Пол по ИИН": p ? p.gender : "", "Замечания проверки": notes.join("; ")
    };
    return window.COLUMNS.map(function (c) { return v[c] !== undefined ? v[c] : ""; }); // столбцы куратора — пустые
  }
  window.__collect = collect;

  // ---------- Отправка ----------
  $("form").addEventListener("submit", function (e) {
    e.preventDefault();
    var errs = validate(), sum = $("summary");
    if (errs.length) {
      sum.hidden = false; sum.textContent = "Исправьте: " + errs.filter(function (x, i, a) { return a.indexOf(x) === i; }).join(", ") + ".";
      var first = document.querySelector(".invalid"); if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    sum.hidden = true;
    if (ageOn($("birth").value, today()) >= 18) { showAdult(); return; }
    if ($("hp").value) { showDone(); return; } // бот
    var payload = JSON.stringify({ columns: window.COLUMNS, row: collect() });
    window.__lastPayload = payload;
    if (!CFG.ENDPOINT) { showDone(); return; }
    var btn = $("submit"); btn.disabled = true; btn.textContent = "Отправляем…";
    fetch(CFG.ENDPOINT, { method: "POST", mode: "no-cors", redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: payload })
      .then(showDone)
      .catch(function () { sum.hidden = false; sum.textContent = "Не удалось отправить: проверьте интернет и попробуйте ещё раз."; })
      .finally(function () { btn.disabled = false; btn.textContent = "Отправить анкету"; });
  });
  function showDone() { $("form").hidden = true; $("privacy").hidden = true; $("done").hidden = false; window.scrollTo(0, 0); }
  function showAdult() { $("form").hidden = true; $("adult").hidden = false; window.scrollTo(0, 0); }
  $("back").addEventListener("click", function () { $("adult").hidden = true; $("form").hidden = false; });
  $("again").addEventListener("click", function () { location.reload(); });
  // 18+ сразу после ввода даты — мягко показать сообщение
  $("birth").addEventListener("change", function () { var a = checkAge(); if (a !== null && a >= 18 && a <= 100) showAdult(); });
  onForeign();
})();
