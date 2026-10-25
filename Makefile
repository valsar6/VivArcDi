test: test-js test-py

test-js:
	node --test "tests/loader/**/*.test.js"

test-py:
	python3 -m unittest discover -s tests/installer

.PHONY: test test-js test-py
