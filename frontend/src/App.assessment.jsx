import { useEffect, useMemo, useState } from "react";
import "./assessment.css";

const apiRoot = (import.meta.env.VITE_API_URL || "http://localhost:5050").replace(/\/$/, "");
const api = `${apiRoot}/api`;

async function readJson(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed with ${response.status}`);
  return payload;
}

function listFrom(payload, key) {
  return Array.isArray(payload) ? payload : payload[key] || [];
}

export default function App() {
  const [courses, setCourses] = useState([]);
  const [homework, setHomework] = useState([]);
  const [courseName, setCourseName] = useState("");
  const [form, setForm] = useState({ course_id: "", title: "", description: "", due_date: "" });
  const [status, setStatus] = useState("checking");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const undatedHomework = useMemo(() => homework.filter((item) => !item.due_date).length, [homework]);

  function showNotice(type, text) {
    setNotice({ type, text });
    window.setTimeout(() => setNotice(null), 3200);
  }

  async function load() {
    setLoading(true);
    try {
      const [healthResponse, coursesResponse, homeworkResponse] = await Promise.all([
        fetch(`${apiRoot}/health`), fetch(`${api}/courses`), fetch(`${api}/homework`)
      ]);
      const [health, coursesPayload, homeworkPayload] = await Promise.all([
        readJson(healthResponse), readJson(coursesResponse), readJson(homeworkResponse)
      ]);
      const nextCourses = listFrom(coursesPayload, "courses");
      const nextHomework = listFrom(homeworkPayload, "homework");
      setCourses(nextCourses);
      setHomework(nextHomework);
      setStatus(health.status === "ok" ? "online" : "offline");
      setLastUpdated(new Date());
      setForm((current) => ({ ...current, course_id: current.course_id || String(nextCourses[0]?.id || "") }));
    } catch (error) {
      setStatus("offline");
      showNotice("error", `Could not load data / تعذر تحميل البيانات: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load().catch(() => undefined); }, []);

  async function addCourse(event) {
    event.preventDefault();
    if (!courseName.trim()) return;
    setBusy("course");
    try {
      await readJson(await fetch(`${api}/courses`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: courseName.trim() })
      }));
      setCourseName("");
      showNotice("success", "Course added / تمت إضافة المادة");
      await load();
    } catch (error) {
      showNotice("error", `Could not add course / تعذر إضافة المادة: ${error.message}`);
    } finally { setBusy(""); }
  }

  async function addHomework(event) {
    event.preventDefault();
    setBusy("homework");
    try {
      await readJson(await fetch(`${api}/homework`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form)
      }));
      setForm((current) => ({ ...current, title: "", description: "", due_date: "" }));
      showNotice("success", "Homework added / تمت إضافة الواجب");
      await load();
    } catch (error) {
      showNotice("error", `Could not add homework / تعذر إضافة الواجب: ${error.message}`);
    } finally { setBusy(""); }
  }

  function resetHomework() {
    setForm((current) => ({ ...current, title: "", description: "", due_date: "" }));
  }

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">EDU CLOUD ASSESSMENT</p>
          <h1>Learning operations, kept simple.</h1>
          <p className="hero-copy">A small React + Express + PostgreSQL demo adapted from the Abdrabo project.</p>
        </div>
        <div className="hero-actions">
          <div className={`health ${status}`}><i /> {status === "online" ? "API + Database online" : status === "checking" ? "Checking connection" : "Connection issue"}</div>
          <button className="ghost-button" type="button" onClick={() => load().catch(() => undefined)} disabled={loading}>{loading ? "Refreshing..." : "↻ Refresh data"}</button>
        </div>
      </header>

      {notice && <div className={`notice ${notice.type}`}>{notice.text}</div>}

      <section className="stats">
        <article><b>{courses.length}</b><span>Courses / المواد</span></article>
        <article><b>{homework.length}</b><span>Homework / الواجبات</span></article>
        <article><b>{undatedHomework}</b><span>Needs due date / تحتاج تاريخ</span></article>
      </section>

      <div className="columns">
        <section className="panel">
          <div className="heading"><div><small>COURSES</small><h2>Courses / المواد</h2></div><em>＋</em></div>
          <form className="inline" onSubmit={addCourse}>
            <input required value={courseName} onChange={(event) => setCourseName(event.target.value)} placeholder="Course name / اسم المادة" />
            <button type="submit" disabled={busy === "course"}>{busy === "course" ? "Adding..." : "Add course"}</button>
          </form>
          <div className="list">
            {courses.length ? courses.map((course) => (
              <div className="course" key={course.id}><strong>{course.name.slice(0, 1).toUpperCase()}</strong><div><b>{course.name}</b><span>{course.teacher_name || "Ready for homework"}</span></div></div>
            )) : <div className="empty">{loading ? "Loading courses..." : "No courses yet / لا توجد مواد بعد"}</div>}
          </div>
        </section>

        <section className="panel">
          <div className="heading"><div><small>HOMEWORK</small><h2>Add homework / إضافة واجب</h2></div><em>✎</em></div>
          <form onSubmit={addHomework}>
            <select required value={form.course_id} onChange={(event) => setForm({ ...form, course_id: event.target.value })}>
              <option value="">Select course / اختر المادة</option>
              {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
            </select>
            <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Title / العنوان" />
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Description / الوصف" />
            <input type="date" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} />
            <div className="form-actions"><button type="button" className="secondary-button" onClick={resetHomework}>Clear</button><button type="submit" disabled={busy === "homework" || !courses.length}>{busy === "homework" ? "Saving..." : "Save homework / حفظ الواجب"}</button></div>
          </form>
          {!courses.length && <p className="helper">Add a course first to enable homework.</p>}
        </section>
      </div>

      <section className="panel homework">
        <div className="heading"><div><small>RECENT WORK</small><h2>Homework / الواجبات</h2></div><em>✓</em></div>
        <div className="list">
          {homework.length ? homework.map((item) => (
            <div className="row" key={item.id}><div><b>{item.title}</b><span>{item.course_name} · {item.description || "No description"}</span></div><time>{item.due_date ? new Date(item.due_date).toLocaleDateString() : "No due date"}</time></div>
          )) : <div className="empty">{loading ? "Loading homework..." : "No homework yet / لا توجد واجبات بعد"}</div>}
        </div>
        {lastUpdated && <p className="updated">Last synced: {lastUpdated.toLocaleTimeString()}</p>}
      </section>
    </main>
  );
}
