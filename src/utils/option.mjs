//@flow

const isValid = a => !isNaN(a) && a !== undefined;

export const Option = <T>(name: string, value: T): Object =>  isValid(value) ? { [name]: value } : {}

