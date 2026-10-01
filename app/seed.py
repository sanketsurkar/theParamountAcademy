"""First-run data. Locally: demo academy. Online (APP_ENV=production): only the admin account."""
import random
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import ADMIN_PASSWORD, IS_PRODUCTION
from .deps import DEFAULT_SETTINGS
from .models import Content, Exam, ExamRemark, FeeInstalment, Notice, Result, Setting, User
from .security import hash_password, password_problem
from .services import create_student, create_teacher, ensure_default_subjects, record_payment, subjects_for
from .storage import files

NAMES = [
    "Aarav Sharma", "Ananya Iyer", "Vihaan Patil", "Diya Kulkarni", "Arjun Deshpande", "Ishita Joshi",
    "Kabir Mehta", "Saanvi Rao", "Reyansh Gupta", "Meera Nair", "Advait Pawar", "Kiara Shah",
    "Aditya Wagh", "Myra Bhosale", "Vivaan Kale", "Anika Chavan", "Rudra Jadhav", "Navya Menon",
    "Ayaan Khan", "Tara Reddy", "Shaurya Thakur", "Riya Sawant", "Atharv Gokhale", "Pari Agarwal",
    "Sai Kumar", "Aadhya Pillai", "Krishna Das", "Avni Mishra", "Dhruv Bhat", "Sara Fernandes",
    "Om Salunkhe", "Nitya Hegde", "Yash Choudhary", "Kavya Sinha", "Ishaan Verma", "Anvi Tiwari",
]
REMARKS = ["Excellent work — keep it up!", "Good progress. Revise weak chapters weekly.",
           "Needs more practice in problem solving.", "Consistent effort, well done.",
           "Can do better with regular homework.", None, None]


def sample_pdf(title: str) -> bytes:
    """A tiny valid one-page PDF with a title line."""
    text = title.replace("\\", "").replace("(", "").replace(")", "")
    stream = f"BT /F1 20 Tf 60 760 Td ({text}) Tj ET BT /F1 12 Tf 60 730 Td (Sample notes - The Paramount Academy) Tj ET"
    objs = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        f"<< /Length {len(stream)} >>\nstream\n{stream}\nendstream",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out, offsets = "%PDF-1.4\n", []
    for i, body in enumerate(objs, start=1):
        offsets.append(len(out.encode()))
        out += f"{i} 0 obj\n{body}\nendobj\n"
    xref = len(out.encode())
    out += f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n" + "".join(f"{o:010d} 00000 n \n" for o in offsets)
    out += f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n"
    return out.encode()


def seed(db: Session) -> None:
    for key, value in DEFAULT_SETTINGS.items():
        if not db.get(Setting, key):
            db.add(Setting(key=key, value=value))
    db.commit()
    ensure_default_subjects(db)

    if db.scalar(select(func.count(User.id))):
        return  # already set up

    if IS_PRODUCTION:
        problem = password_problem(ADMIN_PASSWORD) if ADMIN_PASSWORD else "ADMIN_PASSWORD is not set."
        if problem:
            raise RuntimeError(f"Cannot create the first admin: {problem}")
        db.add(User(login_id="ADM-001", name="Admin", role="admin",
                    password_hash=hash_password(ADMIN_PASSWORD), must_change_password=False))
        db.commit()
        return

    _demo(db)


def _demo(db: Session) -> None:
    print("Empty database - loading demo data for The Paramount Academy...")
    rnd = random.Random(42)
    today = date.today()
    db.get(Setting, "upi_id").value = "paramountacademy@upi"
    db.get(Setting, "phone").value = "+91 98765 43210"

    admin = User(login_id="ADM-001", name="Admin", role="admin",
                 password_hash=hash_password("Admin@123"), must_change_password=False)
    db.add(admin)
    db.flush()
    create_teacher(db, "Priya Deshmukh", "9876500001", "Mathematics, Science", [8, 10], "Teacher@123")
    create_teacher(db, "Rahul Kulkarni", "9876500002", "English, Mathematics", [5], "Teacher@123")
    create_teacher(db, "Sneha Patil", "9876500003", "English", [10], "Teacher@123")

    fee_by_class = {5: 4500, 8: 6000, 10: 7500}
    names = iter(NAMES)
    for std in (5, 8, 10):
        students = []
        for _ in range(12):
            name = next(names)
            user, _ = create_student(db, name, std, f"{rnd.choice(['Suresh', 'Anita', 'Vijay', 'Kavita', 'Manoj'])} "
                                     f"{name.split()[-1]}", f"98{rnd.randint(10000000, 99999999)}", "Student@123")
            user.student.joined_on = today - timedelta(days=120)
            students.append(user.student)
        subjects = subjects_for(db, std)

        # Exams: two published with marks, one upcoming draft.
        ability = {s.id: rnd.uniform(0.45, 0.95) for s in students}
        for name, days_ago, max_marks in (("Unit Test 1", 75, 25), ("Mid-Term", 30, 100)):
            exam = Exam(standard=std, name=name, exam_date=today - timedelta(days=days_ago),
                        max_marks=max_marks, published=True)
            db.add(exam)
            db.flush()
            for st in students:
                for subj in subjects:
                    score = min(max(ability[st.id] + rnd.uniform(-0.15, 0.12), 0.2), 1.0)
                    db.add(Result(exam_id=exam.id, student_id=st.id, subject_id=subj.id,
                                  marks=round(score * max_marks * 2) / 2))
                remark = rnd.choice(REMARKS)
                if remark and name == "Mid-Term":
                    db.add(ExamRemark(exam_id=exam.id, student_id=st.id, remark=remark))
        db.add(Exam(standard=std, name="Unit Test 2", exam_date=today + timedelta(days=5), max_marks=25))

        # Fees: Term 1 paid, Term 2 recently due (mixed), Term 3 upcoming.
        amount = fee_by_class[std]
        for i, st in enumerate(students):
            t1 = FeeInstalment(student_id=st.id, title="Term 1 fee", amount=amount, due_date=today - timedelta(days=90))
            t2 = FeeInstalment(student_id=st.id, title="Term 2 fee", amount=amount, due_date=today - timedelta(days=10))
            t3 = FeeInstalment(student_id=st.id, title="Term 3 fee", amount=amount, due_date=today + timedelta(days=60))
            db.add_all([t1, t2, t3])
            db.flush()
            record_payment(db, t1, amount, "UPI", f"4{rnd.randint(10**10, 10**11 - 1)}", admin.id,
                           today - timedelta(days=rnd.randint(88, 100)))
            if i % 3 == 1:
                record_payment(db, t2, amount, "Cash", "", admin.id, today - timedelta(days=rnd.randint(10, 14)))
            elif i % 3 == 2:
                record_payment(db, t2, amount / 2, "UPI", f"4{rnd.randint(10**10, 10**11 - 1)}", admin.id,
                               today - timedelta(days=12))

        # Course notes: two chapters per subject.
        for subj in subjects:
            for ch, title in ((f"Chapter 1", f"{subj.name} - Chapter 1 notes"),
                              (f"Chapter 2", f"{subj.name} - Chapter 2 practice sheet")):
                key = f"demo_{std}_{subj.id}_{ch[-1]}.pdf"
                data = sample_pdf(f"Class {std} {title}")
                files.save(key, data, "application/pdf")
                db.add(Content(subject_id=subj.id, chapter=ch, title=title, file_path=key, file_type="pdf",
                               size_bytes=len(data), uploaded_by=admin.id))

    db.add_all([
        Notice(title="Welcome to the new Paramount Academy app! 🎉",
               body="Check courses, results, ranks and fees anytime. Add it to your home screen."),
        Notice(title="Term 2 fees are due", body="Please clear pending dues at the office or by UPI."),
        Notice(title="Extra Maths session on Saturday", body="10 AM – 12 PM for Class 10.", standard=10,
               expires_on=today + timedelta(days=14)),
    ])
    db.commit()
    print("Demo data ready.")
