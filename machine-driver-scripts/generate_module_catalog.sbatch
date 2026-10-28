#!/usr/bin/env bash
# Build the Software Modules catalog for the cluster this job runs on.
#
# Submit from this directory:
#   sbatch generate_module_catalog.sbatch [OUTPUT]
# OUTPUT defaults to <cluster>-modules.json in this directory, named from
# cluster_name in ../config.yml, otherwise from SLURM_CLUSTER_NAME.
# Copy it into <app root>/modules/ on the dashboard host. Add --partition or
# --account below if your site requires them.
#SBATCH --job-name=module-catalog
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=48
#SBATCH --time=01:00:00
#SBATCH --output=%x-%j.out
#SBATCH --error=%x-%j.err
set -euo pipefail

cd "${SLURM_SUBMIT_DIR:?Submit this script with sbatch}"

output_args=()
if [[ $# -gt 0 ]]; then
    output_args=(--output "$1")
fi

# generate_module_catalog.py uses all CPUs requested by --cpus-per-task.
srun --cpu-bind=cores python3 generate_module_catalog.py \
    ${output_args[@]+"${output_args[@]}"} \
    --progress-every 25
