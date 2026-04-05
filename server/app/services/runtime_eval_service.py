"""
Runtime code evaluation helpers for programming exercises.

Currently supports reliable execution for Python submissions.
Other languages return evaluated=False so callers can fall back.
"""

from __future__ import annotations

import ast
import io
import re
from contextlib import redirect_stdout
from typing import Any, Dict, List, Optional, Tuple


TOPIC_ALIASES = {
    "python": "python",
    "py": "python",
    "javascript": "javascript",
    "js": "javascript",
    "java": "java",
    "c++": "c++",
    "cpp": "c++",
    "cxx": "c++",
    "c#": "c#",
    "csharp": "c#",
    "cs": "c#",
    "rust": "rust",
}


SAFE_BUILTINS = {
    "abs": abs,
    "all": all,
    "any": any,
    "bool": bool,
    "dict": dict,
    "enumerate": enumerate,
    "float": float,
    "int": int,
    "len": len,
    "list": list,
    "max": max,
    "min": min,
    "print": print,
    "range": range,
    "reversed": reversed,
    "set": set,
    "sorted": sorted,
    "str": str,
    "sum": sum,
    "tuple": tuple,
    "zip": zip,
    "Exception": Exception,
    "ValueError": ValueError,
    "TypeError": TypeError,
}


def normalize_language(language: str) -> str:
    normalized = (language or "python").strip().lower()
    return TOPIC_ALIASES.get(normalized, normalized)


def _normalize_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value).strip())


def _parse_literal(value: Any) -> Tuple[Any, bool]:
    if value is None:
        return None, False
    text = str(value).strip()
    if not text:
        return "", True
    try:
        return ast.literal_eval(text), True
    except Exception:
        return text, False


def _extract_function_name(exercise: Dict[str, Any], code: str) -> Optional[str]:
    requirements = exercise.get("requirements")
    if isinstance(requirements, list):
        for req in requirements:
            req_text = str(req)
            m = re.search(r"named\s+['\"]?([A-Za-z_][A-Za-z0-9_]*)['\"]?", req_text, re.IGNORECASE)
            if m:
                return m.group(1)

    solution = str(exercise.get("solution") or "")
    for candidate in (solution, code):
        match = re.search(r"def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(", candidate)
        if match:
            return match.group(1)

    return None


def _build_call_args(raw_input: Any) -> Tuple[Any, ...]:
    text = "" if raw_input is None else str(raw_input).strip()
    if not text:
        return tuple()

    parsed, ok = _parse_literal(text)
    if ok:
        if isinstance(parsed, tuple):
            return parsed
        return (parsed,)

    if "," in text:
        wrapped = f"({text})"
        parsed_wrapped, wrapped_ok = _parse_literal(wrapped)
        if wrapped_ok and isinstance(parsed_wrapped, tuple):
            return parsed_wrapped

    return (text,)


def _compare_values(actual: Any, expected_raw: Any) -> bool:
    expected, parsed = _parse_literal(expected_raw)
    if parsed:
        return actual == expected
    return _normalize_text(actual) == _normalize_text(expected)


def _run_python_script(code_obj: Any, raw_input: Any) -> str:
    provided = "" if raw_input is None else str(raw_input)
    input_lines = provided.splitlines() if provided else []
    line_iter = iter(input_lines)

    def fake_input(prompt: str = "") -> str:
        try:
            return next(line_iter)
        except StopIteration:
            return ""

    env: Dict[str, Any] = {"__builtins__": dict(SAFE_BUILTINS)}
    env["__builtins__"]["input"] = fake_input

    buffer = io.StringIO()
    with redirect_stdout(buffer):
        exec(code_obj, env, env)
    return buffer.getvalue().strip()


def evaluate_code_runtime(code: str, exercise: Dict[str, Any], language: str = "python") -> Dict[str, Any]:
    """
    Evaluate student code by running it against test cases at runtime.

    Returns evaluated=False when runtime execution is unavailable for the language.
    """
    lang = normalize_language(language)
    if lang != "python":
        return {
            "evaluated": False,
            "passed": False,
            "score": 0,
            "feedback": f"Runtime evaluation is not configured for {language} on this server.",
            "test_results": [],
            "is_correct": False,
        }

    if not code or not str(code).strip():
        return {
            "evaluated": True,
            "passed": False,
            "score": 0,
            "feedback": "No code submitted.",
            "test_results": [],
            "is_correct": False,
        }

    test_cases = exercise.get("test_cases") if isinstance(exercise, dict) else None
    if not isinstance(test_cases, list) or not test_cases:
        return {
            "evaluated": False,
            "passed": False,
            "score": 0,
            "feedback": "No executable test cases were provided for this exercise.",
            "test_results": [],
            "is_correct": False,
        }

    try:
        code_obj = compile(code, "<student_submission>", "exec")
    except Exception as exc:
        return {
            "evaluated": True,
            "passed": False,
            "score": 0,
            "feedback": f"Code has syntax errors: {exc}",
            "issues": [str(exc)],
            "suggestions": ["Fix syntax errors and resubmit."],
            "test_results": [],
            "is_correct": False,
        }

    function_name = _extract_function_name(exercise, code)
    callable_fn = None
    env: Dict[str, Any] = {"__builtins__": dict(SAFE_BUILTINS)}

    if function_name:
        try:
            exec(code_obj, env, env)
            candidate = env.get(function_name)
            if callable(candidate):
                callable_fn = candidate
        except Exception:
            callable_fn = None

    results: List[Dict[str, Any]] = []
    passed_count = 0

    for idx, tc in enumerate(test_cases, start=1):
        raw_input = tc.get("input") if isinstance(tc, dict) else None
        raw_expected = tc.get("expected") if isinstance(tc, dict) else None

        try:
            if callable_fn:
                args = _build_call_args(raw_input)
                actual = callable_fn(*args)
            else:
                actual = _run_python_script(code_obj, raw_input)

            passed = _compare_values(actual, raw_expected)
            if passed:
                passed_count += 1

            results.append(
                {
                    "test": f"Case {idx}",
                    "input": raw_input,
                    "expected": raw_expected,
                    "actual": actual,
                    "passed": passed,
                }
            )
        except Exception as exc:
            results.append(
                {
                    "test": f"Case {idx}",
                    "input": raw_input,
                    "expected": raw_expected,
                    "actual": f"Error: {exc}",
                    "passed": False,
                }
            )

    total = len(results)
    score = round((passed_count / total) * 100, 1) if total else 0.0
    passed_all = passed_count == total and total > 0

    issues = [f"Failed {total - passed_count} of {total} runtime tests."] if not passed_all else []
    suggestions = ["Review edge cases and test outputs before resubmitting."] if not passed_all else ["Great job. Your code passed all runtime tests."]

    return {
        "evaluated": True,
        "is_correct": passed_all,
        "score": score,
        "feedback": (
            f"Runtime evaluation complete: {passed_count}/{total} test cases passed."
            if total
            else "Runtime evaluation completed."
        ),
        "issues": issues,
        "suggestions": suggestions,
        "test_results": results,
        "code_quality_notes": "Evaluation is based on runtime test execution.",
        "passed": passed_all,
    }
