export class QueryError extends Error {
  static name = 'QueryError';

  constructor(message) {
    super(message ?? 'A query error occurred.'); // TODO: better default message

    this.name = QueryError.name;
  }

  static fromJSON(json) {
    const { name, message } = json;

    switch (name) {
      case QueryError.name:
        return new QueryError(message);
      case NumberOfColumnsError.name:
        return NumberOfColumnsError.fromJSON(json);
      case GeneLookupError.name:
        return GeneLookupError.fromJSON(json);
      case NonNumericValueError.name:
        return NonNumericValueError.fromJSON(json);
      // TODO: add new validation error types here
    }
  }

  json() {
    return {
      name: this.name,
      message: this.message
    };
  }
}

export class GeneLookupError extends QueryError {
  static name = 'GeneLookupError';

  constructor(genes, message) {
    super(message ?? 'Several genes are invalid.'); // TODO: better default message

    this.name = GeneLookupError.name;
    this.genes = genes; // in format { row, column, name }
  }

  static fromJSON(json) {
    return new GeneLookupError(json.genes, json.message);
  }

  json() {
    return {
      name: this.name,
      message: this.message,
      genes: this.genes
    };
  }
}

export class NumberOfColumnsError extends QueryError {
  static name = 'NumberOfColumnsError';
 
  constructor(columns, message) {
    super(message ?? 'The number of columns is wrong!'); // TODO: better default message

    this.name = NumberOfColumnsError.name;
    this.columns = columns;
  }

  static fromJSON(json) {
    return new NumberOfColumnsError(json.columns, json.message);
  }

  json() {
    return {
      name: this.name,
      message: this.message,
      columns: this.columns
    };
  }
}

export class NonNumericValueError extends QueryError {
  static name = 'NonNumericValueError';

  constructor(value, column, row, message) {
    super(message ?? `Non-numeric value in input file at ${column}:${row} with value '${value}'.`);

    this.name = NonNumericValueError.name;
    this.value = value;
    this.column = column;
    this.row = row;
  }

  static fromJSON(json) {
    return new NonNumericValueError(json.value, json.column, json.row, json.message);
  }

  json() {
    return {
      name: this.name,
      message: this.message,
      value: this.value,
      column: this.column,
      row: this.row
    };
  }
}
